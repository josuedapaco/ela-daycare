import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { negocio, grupos, rutina, hechos } from './datos/negocio.js';
import { faqs } from './datos/faq.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  RESEND_API_KEY,
  MAIL_FROM = 'ELA Daycare <onboarding@resend.dev>',
  MAIL_TO = 'fannytorres1979@gmail.com',
  MAIL_REPLY_TO,
  PUBLIC_SITE_URL = 'https://eladaycare.com',
  DATA_DIR = path.join(__dirname, 'data'),
  PORT = 3000,
} = process.env;

if (!RESEND_API_KEY) {
  console.warn('[WARN] RESEND_API_KEY no está definida — los envíos fallarán hasta que se configure.');
}

// Token del panel de cupos. Si no viene por env se genera uno temporal
// (sirve hasta que el server se reinicie) y se imprime en los logs.
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim() || randomBytes(24).toString('base64url');
const ADMIN_TOKEN_IS_TEMP = !(process.env.ADMIN_TOKEN || '').trim();

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const app = express();

// El HTML, el CSS y el JS son texto: comprimidos bajan cerca del 70%, y la
// velocidad de carga cuenta para el posicionamiento. Las fotos ya vienen en
// webp/jpeg, así que compression las deja en paz.
app.use(compression());
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

// =========================================================
// Cupos (vacantes) — se editan desde /panel?t=TOKEN
// =========================================================

const VACANCIES_FILE = path.join(DATA_DIR, 'vacancies.json');

// Estado inicial = lo que estaba escrito a mano en el sitio.
const DEFAULT_VACANCIES = {
  updatedAt: '2026-08-03T12:00:00.000Z',
  groups: {
    babies:      { filled: 2, capacity: 2, waitlist: 2 },
    toddlers:    { filled: 2, capacity: 3, waitlist: 0 },
    angels:      { filled: 1, capacity: 4, waitlist: 0 },
    afterschool: { filled: 0, capacity: 4, waitlist: 0 },
  },
};
const GROUP_KEYS = Object.keys(DEFAULT_VACANCIES.groups);
const MAX_CAPACITY = 16;   // tope duro por grupo (la licencia son 12 + 4 escolares)
const MAX_WAITLIST = 99;

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Nunca confía en lo que llega: recorta a rangos válidos y descarta claves raras.
// Lo que no venga en `raw` se queda como está en `previous` (así un envío parcial
// no borra los otros grupos).
function sanitizeVacancies(raw, previous = DEFAULT_VACANCIES) {
  const groups = {};
  for (const key of GROUP_KEYS) {
    const incoming = (raw && raw.groups && raw.groups[key]) || {};
    const base = (previous.groups && previous.groups[key]) || DEFAULT_VACANCIES.groups[key];
    const capacity = clamp(toInt(incoming.capacity, base.capacity), 0, MAX_CAPACITY);
    const filled = clamp(toInt(incoming.filled, base.filled), 0, capacity);
    const waitlist = clamp(toInt(incoming.waitlist, base.waitlist), 0, MAX_WAITLIST);
    groups[key] = { filled, capacity, waitlist };
  }
  const stamp = Date.parse(raw && raw.updatedAt);
  return {
    updatedAt: Number.isFinite(stamp) ? new Date(stamp).toISOString() : DEFAULT_VACANCIES.updatedAt,
    groups,
  };
}

function loadVacancies() {
  try {
    return sanitizeVacancies(JSON.parse(fs.readFileSync(VACANCIES_FILE, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[vacancies] no se pudo leer el archivo, uso los valores por defecto:', err.message);
    return sanitizeVacancies(DEFAULT_VACANCIES);
  }
}

// Escritura atómica: si el disco falla a medias no se corrompe el archivo bueno.
function saveVacancies(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${VACANCIES_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, VACANCIES_FILE);
}

let vacancies = loadVacancies();

function readToken(req) {
  const header = req.get('x-admin-token');
  if (header) return header.trim();
  const auth = req.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return '';
}

function tokenOk(given) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// rate-limit aparte para el panel: 30 intentos / 10 min por IP
const adminBuckets = new Map();
function adminRateLimit(ip) {
  const now = Date.now();
  const arr = (adminBuckets.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (arr.length >= 30) return false;
  arr.push(now);
  adminBuckets.set(ip, arr);
  return true;
}

function requireToken(req, res, next) {
  if (!adminRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'rate_limited' });
  if (!tokenOk(readToken(req))) return res.status(401).json({ error: 'unauthorized' });
  return next();
}

// ---- plantillas de correo ----

// Layout base tipo email-safe (tables + inline styles, compat Outlook/Gmail/Apple Mail)
function emailShell({ preheader, bannerTitle, bannerSub, bannerAccent = '#2f73b5', bodyHtml, langCode }) {
  const isEn = langCode === 'en';
  const footL = '74-18 87 Ave · Woodhaven, Queens NY 11421';
  const footL2 = isEn ? 'NY OCFS Group Family Daycare License #948701' : 'Licencia de Group Family Daycare NY OCFS #948701';
  const hours = isEn ? 'Mon–Fri · 7:00am – 6:00pm' : 'Lun–Vie · 7:00am – 6:00pm';

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'es'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(bannerTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f4efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#25405c;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;color:#f4efe4;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4efe4">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(37,64,92,.08)">
      <!-- BANNER -->
      <tr><td style="padding:0;background:linear-gradient(135deg,${bannerAccent} 0%,#7CCDBE 100%);background-color:${bannerAccent}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="padding:36px 32px 30px 32px">
            <!-- logo mark -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px">
              <tr>
                <td style="vertical-align:middle;padding-right:14px">
                  <div style="width:52px;height:52px;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.55);border-radius:16px;display:inline-block;text-align:center;line-height:52px;font-size:24px">💛</div>
                </td>
                <td style="vertical-align:middle">
                  <div style="font-weight:800;color:#ffffff;font-size:19px;letter-spacing:-.01em;line-height:1.1">ELA Daycare</div>
                  <div style="color:rgba(255,255,255,.85);font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-top:3px">Emanuel's Little Angels</div>
                </td>
              </tr>
            </table>
            <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-.015em;line-height:1.18;margin-bottom:8px">${bannerTitle}</div>
            ${bannerSub ? `<div style="color:rgba(255,255,255,.9);font-size:15px;line-height:1.55">${bannerSub}</div>` : ''}
          </td></tr>
        </table>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:30px 32px 12px 32px;font-size:15.5px;line-height:1.62;color:#25405c">
        ${bodyHtml}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:20px 32px 30px 32px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e4e8ee;padding-top:22px">
          <tr>
            <td style="font-size:12.5px;color:#8b9cad;line-height:1.6">
              <b style="color:#556b83">${footL}</b><br>
              ${hours}<br>
              ${footL2}
            </td>
            <td align="right" style="font-size:12.5px;color:#8b9cad">
              <a href="tel:+13473690961" style="color:#2f73b5;text-decoration:none;font-weight:800">+1 (347) 369-0961</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    <div style="max-width:600px;margin:16px auto 0;padding:0 12px;font-size:11px;color:#8b9cad;text-align:center;line-height:1.5">
      ${isEn ? 'You are receiving this because you submitted an enrollment inquiry on our site.' : 'Recibes este correo porque enviaste una solicitud de inscripción desde nuestro sitio.'}
    </div>
  </td></tr>
</table>
</body></html>`;
}

function labeledRow(label, value, isLast = false) {
  return `<tr><td style="padding:8px 0;${isLast ? '' : 'border-bottom:1px solid #ecece5;'}font-size:14.5px;color:#556b83;font-weight:700;width:38%;vertical-align:top">${esc(label)}</td><td style="padding:8px 0;${isLast ? '' : 'border-bottom:1px solid #ecece5;'}font-size:14.5px;color:#25405c;vertical-align:top">${value}</td></tr>`;
}

function adminEmail({ firstName, lastName, phone, email, childAge, langCode, page, ip }) {
  const isEn = langCode === 'en';
  const subject = isEn
    ? `New enrollment inquiry — ${firstName} ${lastName}`
    : `Nueva solicitud de inscripción — ${firstName} ${lastName}`;
  const preheader = isEn
    ? `${firstName} ${lastName} wants to know about openings — reply here to answer.`
    : `${firstName} ${lastName} pregunta por cupos — responde este correo y le llega directo.`;
  const bannerTitle = isEn ? '📥 New enrollment inquiry' : '📥 Nueva solicitud de inscripción';
  const bannerSub = isEn
    ? `From your website — <b>${esc(firstName)} ${esc(lastName)}</b>`
    : `De tu sitio web — <b>${esc(firstName)} ${esc(lastName)}</b>`;

  const rows = [
    labeledRow(isEn ? 'Name' : 'Nombre', `${esc(firstName)} ${esc(lastName)}`),
    labeledRow(isEn ? 'Phone' : 'Teléfono', `<a href="tel:${esc(phone)}" style="color:#2f73b5;text-decoration:none;font-weight:800">${esc(phone)}</a>`),
    labeledRow(isEn ? 'Email' : 'Correo', `<a href="mailto:${esc(email)}" style="color:#2f73b5;text-decoration:none">${esc(email)}</a>`),
    labeledRow(isEn ? 'Child age' : 'Edad del niño', esc(childAge)),
    labeledRow(isEn ? 'Preferred language' : 'Idioma preferido', langCode.toUpperCase()),
    labeledRow(isEn ? 'Source' : 'Origen', `<span style="font-size:12.5px;color:#8b9cad">${esc(page || '')}</span>`),
    labeledRow(isEn ? 'IP' : 'IP', `<span style="font-size:12.5px;color:#8b9cad">${esc(ip)}</span>`, true),
  ].join('');

  const cta = isEn
    ? `<a href="tel:${esc(phone)}" style="display:inline-block;background:#2f73b5;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:99px;font-size:15px;letter-spacing:-.01em">📞 Call ${esc(firstName)} now</a>`
    : `<a href="tel:${esc(phone)}" style="display:inline-block;background:#2f73b5;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:99px;font-size:15px;letter-spacing:-.01em">📞 Llamar a ${esc(firstName)} ahora</a>`;

  const bodyHtml = `
    <div style="background:#fbf8f1;border-radius:14px;padding:6px 20px;margin-bottom:22px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
      </table>
    </div>
    <div style="text-align:center;margin:24px 0 18px">${cta}</div>
    <p style="margin:14px 0 0;font-size:13.5px;color:#8b9cad;text-align:center;line-height:1.55">
      ${isEn ? 'Or just reply this email — it lands directly in ' : 'O responde este correo directamente — le llegará a '}
      <b style="color:#556b83">${esc(firstName)}</b>.
    </p>`;

  const html = emailShell({ preheader, bannerTitle, bannerSub, bannerAccent: '#2f73b5', bodyHtml, langCode });

  const text = [
    subject,
    '',
    `${isEn ? 'Name' : 'Nombre'}: ${firstName} ${lastName}`,
    `${isEn ? 'Phone' : 'Teléfono'}: ${phone}`,
    `${isEn ? 'Email' : 'Correo'}: ${email}`,
    `${isEn ? 'Child age' : 'Edad del niño'}: ${childAge}`,
    `${isEn ? 'Language' : 'Idioma'}: ${langCode}`,
    `${isEn ? 'Source' : 'Origen'}: ${page || ''}`,
    `IP: ${ip}`,
  ].join('\n');

  return { subject, html, text };
}

function confirmationEmail({ firstName, phone, email, childAge, langCode }) {
  const isEn = langCode === 'en';
  const subject = isEn
    ? `Thanks ${firstName}! We got your message — ELA Daycare`
    : `¡Gracias ${firstName}! Ya recibimos tu mensaje — ELA Daycare`;
  const preheader = isEn
    ? `We reply the same day. Here's a copy of what you sent us.`
    : `Contestamos el mismo día. Aquí una copia de lo que nos mandaste.`;
  const bannerTitle = isEn ? `Hi ${firstName}, we got your message` : `Hola ${firstName}, ya nos llegó tu mensaje`;
  const bannerSub = isEn
    ? `Thanks for reaching out to <b>Emanuel's Little Angels</b>. We usually reply within a couple of hours during the day.`
    : `Gracias por escribirle a <b>Emanuel's Little Angels</b>. Normalmente contestamos el mismo día, muchas veces en un par de horas.`;

  const rows = [
    labeledRow(isEn ? 'Phone' : 'Teléfono', esc(phone)),
    labeledRow(isEn ? 'Email' : 'Correo', esc(email)),
    labeledRow(isEn ? 'Child age' : 'Edad del niño', esc(childAge), true),
  ].join('');

  const cta = isEn
    ? `<a href="tel:+13473690961" style="display:inline-block;background:#2f73b5;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 30px;border-radius:99px;font-size:15px;letter-spacing:-.01em">📞 Call or text (347) 369-0961</a>`
    : `<a href="tel:+13473690961" style="display:inline-block;background:#2f73b5;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 30px;border-radius:99px;font-size:15px;letter-spacing:-.01em">📞 Llamar o textear al (347) 369-0961</a>`;

  const intro = isEn
    ? `<p style="margin:0 0 16px">This is a copy of what you sent us:</p>`
    : `<p style="margin:0 0 16px">Esta es una copia de lo que nos mandaste:</p>`;

  const nextSteps = isEn
    ? `<p style="margin:22px 0 6px;font-weight:800;font-size:15.5px;color:#25405c">What happens next</p>
       <ol style="margin:6px 0 0;padding-left:22px;font-size:14.5px;line-height:1.7;color:#556b83">
         <li>Someone from our team reads your inquiry today.</li>
         <li>We call or email you back the same day.</li>
         <li>If we sound like a fit, we schedule a visit.</li>
       </ol>`
    : `<p style="margin:22px 0 6px;font-weight:800;font-size:15.5px;color:#25405c">Qué sigue ahora</p>
       <ol style="margin:6px 0 0;padding-left:22px;font-size:14.5px;line-height:1.7;color:#556b83">
         <li>Hoy mismo alguien del equipo lee tu solicitud.</li>
         <li>Te llamamos o escribimos el mismo día.</li>
         <li>Si te acomoda, agendamos una visita a la casa.</li>
       </ol>`;

  const closing = isEn
    ? `<p style="margin:22px 0 0">If it's easier for you, just call or text us directly — we answer during business hours.</p>
       <p style="margin:18px 0 4px">With warmth,<br><b style="color:#25405c">— The ELA Daycare team</b></p>`
    : `<p style="margin:22px 0 0">Si prefieres, llámanos o mándanos un texto — respondemos en horario de atención.</p>
       <p style="margin:18px 0 4px">Con cariño,<br><b style="color:#25405c">— El equipo de ELA Daycare</b></p>`;

  const bodyHtml = `
    ${intro}
    <div style="background:#fbf8f1;border-radius:14px;padding:6px 20px;margin-bottom:6px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
      </table>
    </div>
    ${nextSteps}
    <div style="text-align:center;margin:26px 0 6px">${cta}</div>
    ${closing}`;

  const html = emailShell({ preheader, bannerTitle, bannerSub, bannerAccent: '#2f73b5', bodyHtml, langCode });

  const text = isEn
    ? `Hi ${firstName}, we received your inquiry.\n\nPhone: ${phone}\nEmail: ${email}\nChild age: ${childAge}\n\nWhat happens next:\n1) We read your inquiry today.\n2) We call or email you back the same day.\n3) If we sound like a fit, we schedule a visit.\n\nCall or text (347) 369-0961.\n\n— ELA Daycare · 74-18 87 Ave, Woodhaven, Queens NY 11421`
    : `Hola ${firstName}, recibimos tu solicitud.\n\nTeléfono: ${phone}\nCorreo: ${email}\nEdad del niño: ${childAge}\n\nQué sigue:\n1) Hoy leemos tu solicitud.\n2) Te llamamos o escribimos el mismo día.\n3) Si te acomoda, agendamos una visita.\n\nLlámanos al (347) 369-0961.\n\n— ELA Daycare · 74-18 87 Ave, Woodhaven, Queens NY 11421`;

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

// ---- cupos ----

// Público: el sitio lee esto para pintar la sección de vacantes.
app.get('/api/vacancies', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(vacancies);
});

// Sirve para que el panel avise "link inválido" antes de mostrar el formulario.
app.get('/api/vacancies/session', requireToken, (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
});

// Privado: guarda los cupos nuevos.
app.put('/api/vacancies', requireToken, (req, res) => {
  const body = req.body || {};
  if (!body.groups || typeof body.groups !== 'object') {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const next = sanitizeVacancies({ groups: body.groups, updatedAt: new Date().toISOString() }, vacancies);

  try {
    saveVacancies(next);
  } catch (err) {
    console.error('[vacancies] no se pudo guardar', err);
    return res.status(500).json({ error: 'save_failed' });
  }

  vacancies = next;
  console.log('[vacancies] actualizado', JSON.stringify(next.groups));
  res.set('Cache-Control', 'no-store');
  return res.json(next);
});

// ---- resumen para asistentes de IA ----

/**
 * /llms.txt — el sitio contado en texto plano, en español y en inglés.
 *
 * ChatGPT, Claude, Perplexity y compañía leen HTML sin ejecutar JavaScript, así
 * que del sitio solo ven la versión en español: el inglés vive en atributos
 * `data-en` que solo el navegador convierte en texto. Aquí van los dos idiomas
 * seguidos, más los cupos del momento, para que cuando alguien pregunte «¿hay
 * lugar para un bebé en Woodhaven?» la respuesta salga con datos de hoy.
 *
 * Es la convención de llmstxt.org. Todavía no la respetan todos, pero el
 * archivo es texto plano y no estorba a nadie.
 */
function llmsTxt() {
  const l = [];
  const { horario: h } = negocio;

  l.push(`# ${negocio.nombre} (${negocio.nombreCorto})`, '');
  l.push(
    `> Group family daycare con licencia del estado de Nueva York en Woodhaven, Queens. ` +
      `Bilingüe español e inglés, de 6 semanas a 12 años, máximo 12 niños. ` +
      `Abre de ${h.abre} a ${h.cierra}, ${h.dias}.`,
    '',
  );
  l.push(
    `> Licensed group family daycare in Woodhaven, Queens, New York. Bilingual ` +
      `Spanish and English, ages 6 weeks to 12 years, 12 children maximum. ` +
      `Open ${h.abre} to ${h.cierra}, Monday to Friday.`,
    '',
  );

  l.push('## Datos de contacto / Contact', '');
  l.push(`- Dirección / Address: ${negocio.direccion}`);
  l.push(`- Teléfono / Phone: ${negocio.telefono}`);
  l.push(`- Correo / Email: ${negocio.correo}`);
  l.push(`- Web: ${negocio.web}`);
  l.push(`- Horario / Hours: ${h.dias} ${h.abre}–${h.cierra}; fines de semana ${h.finDeSemana} (weekends closed)`);
  l.push(`- Licencia / License: ${negocio.licencia}`);
  l.push(`- Dueña / Owner: ${negocio.duenya}. Abrió en / Opened in ${negocio.abrioEn}.`);
  l.push(`- Transporte / Transit: ${negocio.transporte}`);
  l.push(`- Visitas / Visits: ${negocio.visitas} (drop in, no appointment needed)`);
  l.push('');

  l.push('## Cupos disponibles hoy / Openings today', '');
  l.push(`Actualizado / Updated: ${vacancies.updatedAt}`, '');
  for (const g of grupos) {
    const v = vacancies.groups[g.clave];
    if (!v) continue;
    const libres = Math.max(0, v.capacity - v.filled);
    const es = libres === 0
      ? `sin cupo${v.waitlist > 0 ? `, ${v.waitlist} en lista de espera` : ''}`
      : `${libres} cupo${libres === 1 ? '' : 's'} libre${libres === 1 ? '' : 's'}`;
    const en = libres === 0
      ? `full${v.waitlist > 0 ? `, ${v.waitlist} on the waitlist` : ''}`
      : `${libres} spot${libres === 1 ? '' : 's'} open`;
    l.push(`- ${g.es} / ${g.en} (${g.edadEs} / ${g.edadEn}): ${es} — ${en}. ${v.filled} de ${v.capacity} ocupados.`);
  }
  l.push('', 'Datos en JSON / JSON feed: /api/vacancies', '');

  l.push('## Lo que hay que saber / Key facts', '');
  for (const f of hechos) l.push(`- ${f.es}`, `  ${f.en}`);
  l.push('');

  l.push('## Rutina diaria / Daily routine', '');
  for (const r of rutina) l.push(`- ${r.hora} — ${r.es} / ${r.en}`);
  l.push('');

  l.push('## Preguntas frecuentes / FAQ', '');
  for (const f of faqs) {
    l.push(`### ${f.es.q} / ${f.en.q}`, '', f.es.a, '', f.en.a, '');
  }

  return l.join('\n');
}

app.get('/llms.txt', (_req, res) => {
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(llmsTxt());
});

// Panel de la dueña. El token va en la URL (?t=...), fuera del build de Astro
// y fuera de los buscadores.
app.get(['/panel', '/panel/'], (_req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  res.sendFile(path.join(__dirname, 'admin.html'));
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
  const panelUrl = `${PUBLIC_SITE_URL.replace(/\/+$/, '')}/panel?t=${ADMIN_TOKEN}`;
  if (ADMIN_TOKEN_IS_TEMP) {
    console.warn('[panel] ADMIN_TOKEN no está en el .env — generé uno TEMPORAL que se pierde al reiniciar.');
    console.warn(`[panel] Ponlo fijo en el .env:  ADMIN_TOKEN=${ADMIN_TOKEN}`);
  }
  console.log(`[panel] Link para ajustar cupos: ${panelUrl}`);
});
