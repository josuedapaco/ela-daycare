import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  RESEND_API_KEY,
  MAIL_FROM = 'ELA Daycare <onboarding@resend.dev>',
  MAIL_TO = 'hola@eladaycare.com',
  MAIL_REPLY_TO,
  PORT = 3000,
} = process.env;

if (!RESEND_API_KEY) {
  console.warn('[WARN] RESEND_API_KEY no está definida — los envíos fallarán hasta que se configure.');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const app = express();

app.use(express.json({ limit: '32kb' }));
app.disable('x-powered-by');
app.set('trust proxy', 1);

// rate-limit simple en memoria: 5 envíos / 10 min por IP
const buckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 5;
  const arr = (buckets.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  buckets.set(ip, arr);
  return true;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

app.post('/api/enroll', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'rate_limited' });

  const b = req.body || {};

  // honeypot
  if (b.website) return res.json({ ok: true });

  const firstName = (b.firstName || '').toString().trim().slice(0, 80);
  const lastName = (b.lastName || '').toString().trim().slice(0, 80);
  const phone = (b.phone || '').toString().trim().slice(0, 40);
  const email = (b.email || '').toString().trim().slice(0, 160);
  const childAge = (b.childAge || '').toString().trim().slice(0, 80);
  const langCode = b.lang === 'en' ? 'en' : 'es';

  if (!firstName || !lastName || !phone || !email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  if (!resend) return res.status(503).json({ error: 'mailer_not_configured' });

  const subject = langCode === 'en'
    ? `New enrollment inquiry — ${firstName} ${lastName}`
    : `Nueva solicitud de inscripción — ${firstName} ${lastName}`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#25405c">
      <h2 style="margin:0 0 12px;color:#2f73b5">${esc(subject)}</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><b>Nombre:</b></td><td>${esc(firstName)} ${esc(lastName)}</td></tr>
        <tr><td><b>Teléfono:</b></td><td><a href="tel:${esc(phone)}">${esc(phone)}</a></td></tr>
        <tr><td><b>Correo:</b></td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        <tr><td><b>Edad del niño:</b></td><td>${esc(childAge)}</td></tr>
        <tr><td><b>Idioma preferido:</b></td><td>${langCode.toUpperCase()}</td></tr>
        <tr><td><b>Origen:</b></td><td>${esc(b.page || '')}</td></tr>
        <tr><td><b>IP:</b></td><td>${esc(ip)}</td></tr>
      </table>
    </div>`;

  const text = [
    subject,
    `Nombre: ${firstName} ${lastName}`,
    `Teléfono: ${phone}`,
    `Correo: ${email}`,
    `Edad del niño: ${childAge}`,
    `Idioma: ${langCode}`,
    `Origen: ${b.page || ''}`,
    `IP: ${ip}`,
  ].join('\n');

  try {
    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to: MAIL_TO.split(',').map(s => s.trim()).filter(Boolean),
      reply_to: MAIL_REPLY_TO || email,
      subject,
      html,
      text,
    });
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('[resend] error', e);
    return res.status(502).json({ error: 'send_failed' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, mailer: !!resend }));

// estáticos: build de Astro (dist/)
const STATIC_ROOT = path.join(__dirname, 'dist');
app.use(express.static(STATIC_ROOT, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else if (filePath.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (/\.(webp|jpg|jpeg|png|svg|woff2?)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=2592000');
  }
}));

app.listen(PORT, () => {
  console.log(`ELA Daycare listening on http://0.0.0.0:${PORT}`);
});
