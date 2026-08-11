import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  RESEND_API_KEY,
  MAIL_FROM = 'ELA Daycare <onboarding@resend.dev>',
  MAIL_TO = 'josueriera23@gmail.com',
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

// ---- plantillas de correo ----

function adminEmail({ firstName, lastName, phone, email, childAge, langCode, page, ip }) {
  const subject = langCode === 'en'
    ? `New enrollment inquiry — ${firstName} ${lastName}`
    : `Nueva solicitud de inscripción — ${firstName} ${lastName}`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#25405c;max-width:560px">
      <h2 style="margin:0 0 12px;color:#2f73b5">${esc(subject)}</h2>
      <table cellpadding="6" style="border-collapse:collapse;background:#fbf8f1;border-radius:8px;padding:8px">
        <tr><td><b>Nombre:</b></td><td>${esc(firstName)} ${esc(lastName)}</td></tr>
        <tr><td><b>Teléfono:</b></td><td><a href="tel:${esc(phone)}" style="color:#2f73b5">${esc(phone)}</a></td></tr>
        <tr><td><b>Correo:</b></td><td><a href="mailto:${esc(email)}" style="color:#2f73b5">${esc(email)}</a></td></tr>
        <tr><td><b>Edad del niño:</b></td><td>${esc(childAge)}</td></tr>
        <tr><td><b>Idioma preferido:</b></td><td>${langCode.toUpperCase()}</td></tr>
        <tr><td><b>Origen:</b></td><td>${esc(page || '')}</td></tr>
        <tr><td><b>IP:</b></td><td>${esc(ip)}</td></tr>
      </table>
      <p style="color:#556b83;font-size:13.5px;margin-top:16px">
        Responde este correo directamente y le llegará a ${esc(firstName)}.
      </p>
    </div>`;

  const text = [
    subject,
    `Nombre: ${firstName} ${lastName}`,
    `Teléfono: ${phone}`,
    `Correo: ${email}`,
    `Edad del niño: ${childAge}`,
    `Idioma: ${langCode}`,
    `Origen: ${page || ''}`,
    `IP: ${ip}`,
  ].join('\n');

  return { subject, html, text };
}

function confirmationEmail({ firstName, phone, email, childAge, langCode }) {
  if (langCode === 'en') {
    const subject = `Thanks ${firstName}! We received your inquiry — ELA Daycare`;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15.5px;color:#25405c;max-width:560px;line-height:1.55">
        <h2 style="margin:0 0 14px;color:#2f73b5;font-size:22px">Hi ${esc(firstName)}, we got your message 💛</h2>
        <p>Thanks so much for reaching out to <b>Emanuel's Little Angels</b>. We usually reply the same day — often within a couple of hours.</p>
        <p>Here's what you sent us:</p>
        <table cellpadding="6" style="border-collapse:collapse;background:#fbf8f1;border-radius:8px;font-size:14.5px">
          <tr><td><b>Phone:</b></td><td>${esc(phone)}</td></tr>
          <tr><td><b>Email:</b></td><td>${esc(email)}</td></tr>
          <tr><td><b>Child age:</b></td><td>${esc(childAge)}</td></tr>
        </table>
        <p style="margin-top:18px">If it's easier, feel free to call or text us at <a href="tel:+13473690961" style="color:#2f73b5"><b>(347) 369-0961</b></a>.</p>
        <p style="margin-top:24px">— The ELA Daycare team<br><small style="color:#8b9cad">Jackson Heights, Queens · NY OCFS License #948701</small></p>
      </div>`;
    const text = `Hi ${firstName}, we received your inquiry.\n\nPhone: ${phone}\nEmail: ${email}\nChild age: ${childAge}\n\nWe reply the same day. Call or text (347) 369-0961.\n\n— ELA Daycare`;
    return { subject, html, text };
  }

  const subject = `¡Gracias ${firstName}! Recibimos tu solicitud — ELA Daycare`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15.5px;color:#25405c;max-width:560px;line-height:1.55">
      <h2 style="margin:0 0 14px;color:#2f73b5;font-size:22px">Hola ${esc(firstName)}, ya nos llegó tu mensaje 💛</h2>
      <p>Gracias por escribirle a <b>Emanuel's Little Angels</b>. Normalmente contestamos el mismo día — muchas veces en un par de horas.</p>
      <p>Esto es lo que nos mandaste:</p>
      <table cellpadding="6" style="border-collapse:collapse;background:#fbf8f1;border-radius:8px;font-size:14.5px">
        <tr><td><b>Teléfono:</b></td><td>${esc(phone)}</td></tr>
        <tr><td><b>Correo:</b></td><td>${esc(email)}</td></tr>
        <tr><td><b>Edad del niño:</b></td><td>${esc(childAge)}</td></tr>
      </table>
      <p style="margin-top:18px">Si prefieres, llámanos o mándanos un texto al <a href="tel:+13473690961" style="color:#2f73b5"><b>(347) 369-0961</b></a>.</p>
      <p style="margin-top:24px">— El equipo de ELA Daycare<br><small style="color:#8b9cad">Jackson Heights, Queens · Licencia OCFS de NY #948701</small></p>
    </div>`;
  const text = `Hola ${firstName}, recibimos tu solicitud.\n\nTeléfono: ${phone}\nCorreo: ${email}\nEdad del niño: ${childAge}\n\nContestamos el mismo día. Llámanos al (347) 369-0961.\n\n— ELA Daycare`;
  return { subject, html, text };
}

app.post('/api/enroll', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'rate_limited' });

  const b = req.body || {};

  // honeypot
  if (b.website) return res.json({ ok: true });

  const data = {
    firstName: (b.firstName || '').toString().trim().slice(0, 80),
    lastName: (b.lastName || '').toString().trim().slice(0, 80),
    phone: (b.phone || '').toString().trim().slice(0, 40),
    email: (b.email || '').toString().trim().slice(0, 160),
    childAge: (b.childAge || '').toString().trim().slice(0, 80),
    langCode: b.lang === 'en' ? 'en' : 'es',
    page: (b.page || '').toString().slice(0, 500),
    ip,
  };

  if (!data.firstName || !data.lastName || !data.phone || !data.email || !/.+@.+\..+/.test(data.email)) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  if (!resend) return res.status(503).json({ error: 'mailer_not_configured' });

  const admin = adminEmail(data);
  const confirm = confirmationEmail(data);

  const to = MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean);

  const adminSend = resend.emails.send({
    from: MAIL_FROM,
    to,
    reply_to: MAIL_REPLY_TO || data.email,
    subject: admin.subject,
    html: admin.html,
    text: admin.text,
  });

  const confirmSend = resend.emails.send({
    from: MAIL_FROM,
    to: [data.email],
    reply_to: MAIL_REPLY_TO || (Array.isArray(to) ? to[0] : to),
    subject: confirm.subject,
    html: confirm.html,
    text: confirm.text,
  });

  const [adminRes, confirmRes] = await Promise.allSettled([adminSend, confirmSend]);

  const adminOk = adminRes.status === 'fulfilled' && !adminRes.value?.error;
  const confirmOk = confirmRes.status === 'fulfilled' && !confirmRes.value?.error;

  if (!adminOk) {
    console.error('[resend] admin email failed', adminRes.status === 'rejected' ? adminRes.reason : adminRes.value?.error);
    return res.status(502).json({ error: 'send_failed' });
  }
  if (!confirmOk) {
    // No es crítico: la solicitud llegó al admin. Loguea pero no falla el request.
    console.warn('[resend] confirmation email failed (no bloquea)', confirmRes.status === 'rejected' ? confirmRes.reason : confirmRes.value?.error);
  }

  return res.json({ ok: true, confirmationSent: confirmOk });
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
