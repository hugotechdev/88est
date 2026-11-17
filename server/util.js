// Vitu vya kusaidia: namba za simu, kutuma email, uthibitisho wa taarifa
const { httpError } = require('./router');

const CATEGORIES = ['nyumba', 'apartment', 'chumba', 'kiwanja', 'shamba', 'frame', 'ofisi', 'ghala', 'short_stay', 'ukumbi', 'mradi'];
const DEALS = ['rent', 'sale', 'short'];
const PERIODS = ['month', 'year', 'night', 'day', 'total'];
const ACCOUNT_TYPES = ['agent', 'developer', 'owner'];
const AMENITIES = ['maji', 'luku_binafsi', 'luku_pamoja', 'uzio', 'geti', 'parking', 'ulinzi', 'cctv', 'fenicha', 'ac', 'wifi', 'jiko_ndani', 'choo_ndani', 'tiles', 'gypsum', 'solar', 'generator', 'lift', 'bwawa', 'gym', 'barabara_lami', 'karibu_barabara', 'bustani', 'stoo'];
const PLAN_CATEGORIES = ['kiwanja', 'shamba', 'mradi'];
// Sifa za ziada za tangazo (zinatofautiana kwa kila aina ya mali)
const DETAIL_KEYS = {
  room_type: 'str', toilet: 'str', furnished: 'str', floor: 'num', zoning: 'str', road_access: 'str', water_source: 'str',
  current_use: 'str', shop_location: 'str', rooms: 'num', height: 'num', truck_access: 'bool', power: 'str', guests: 'num',
  capacity: 'num', completion: 'str', unit_types: 'str',
};
function cleanDetails(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, t] of Object.entries(DETAIL_KEYS)) {
    const v = obj[k];
    if (v === undefined || v === null || v === '') continue;
    if (t === 'num') { const n = Number(v); if (Number.isFinite(n) && n >= 0 && n < 1e7) out[k] = n; }
    else if (t === 'bool') out[k] = v === true || v === 'true';
    else out[k] = String(v).trim().slice(0, 100);
  }
  return out;
}
const PLOT_STATUS = ['available', 'reserved', 'sold'];
const REPORT_REASONS = ['utapeli', 'picha_si_halisi', 'bei_si_sahihi', 'imeshachukuliwa', 'mawasiliano_hayapatikani', 'nyingine'];

// Inabadilisha 0712345678 / +255712345678 / 712345678 kuwa 255712345678
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) d = '255' + d.slice(1);
  else if (d.length === 9) d = '255' + d;
  if (/^255[1-9]\d{8}$/.test(d)) return d;
  return null;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'muuzaji';
}

async function uniqueSlug(db, base, excludeId = 0) {
  let s = slugify(base);
  let i = 1;
  while (await db.one('SELECT id FROM users WHERE slug = $1 AND id <> $2', [s, excludeId])) {
    i += 1;
    s = slugify(base) + '-' + i;
  }
  return s;
}

function str(v, max = 200) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}
function int(v, min = 0, max = 1e12) {
  if (v === undefined || v === null || v === '') return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function bool(v) {
  if (v === undefined || v === null || v === '') return null;
  return v === true || v === 'true' || v === 1 || v === '1';
}
function need(cond, msg) {
  if (!cond) throw httpError(400, msg);
}
function isEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ''));
}

// Toleo la Terms and Conditions (public/terms.html). Ukibadilisha masharti, badilisha hapa ili wauzaji wakubali upya.
const TERMS_VERSION = '2026-11-17.2';

function isAdmin(u) {
  return !!u && (u.role === 'admin' || u.role === 'superadmin');
}

function isPro(u) {
  return u && u.plan === 'pro' && u.pro_until && new Date(u.pro_until) > new Date();
}

// Taarifa za muuzaji zinazoonekana kwa umma (bila password, OTP, n.k.)
function publicSeller(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    business_name: u.business_name,
    slug: u.slug,
    account_type: u.account_type,
    phone: u.phone,
    whatsapp: u.whatsapp || u.phone,
    region: u.region,
    district: u.district,
    ward: u.ward,
    service_areas: u.service_areas,
    bio: u.bio,
    avatar_id: u.avatar_id,
    verify_level: u.verify_level,
    pro: !!isPro(u),
    created_at: u.created_at,
  };
}

// Taarifa za mwenye akaunti mwenyewe
function selfUser(u) {
  const p = publicSeller(u);
  return {
    ...p,
    role: u.role,
    email: u.email,
    email_verified: u.email_verified,
    phone_verified: u.phone_verified,
    lat: u.lat,
    lng: u.lng,
    plan: u.plan,
    pro_until: u.pro_until,
    terms_accepted: isAdmin(u) || u.terms_version === TERMS_VERSION,
    marketing_ok: !!u.marketing_ok,
    status: u.status,
  };
}

// ===== Kutuma email =====
// Njia 1 (bure): faili la PHP kwenye cPanel yako (MAIL_RELAY_URL + MAIL_RELAY_KEY)
// Njia 2: Brevo (BREVO_API_KEY + MAIL_FROM)
// Railway Hobby inazuia SMTP, ndiyo maana tunatumia HTTPS.
function emailHtml(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#F4F4F2;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F2;padding:24px 0"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1F2125;padding:20px 24px;font-size:24px;font-weight:bold;color:#F4F4F2;letter-spacing:1px">88<span style="color:#C9A24A">EST</span>
<div style="font-size:12px;color:#9A9EA6;font-weight:normal;letter-spacing:0">Real estate marketplace</div></td></tr>
<tr><td style="padding:24px;color:#1F2125;font-size:15px;line-height:1.6"><h2 style="margin:0 0 12px;font-size:19px">${esc(title)}</h2>${bodyHtml}</td></tr>
<tr><td style="padding:14px 24px;background:#F4F4F2;color:#6B7078;font-size:12px">88EST · Huduma ya HUGO TECH</td></tr>
</table></td></tr></table></body></html>`;
}

async function sendEmail(to, subject, title, bodyHtml) {
  if (!to) return false;
  const html = emailHtml(title, bodyHtml);
  const from = process.env.MAIL_FROM || 'no-reply@hugotech.co.tz';
  try {
    if (process.env.MAIL_RELAY_URL) {
      const r = await fetch(process.env.MAIL_RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Relay-Key': process.env.MAIL_RELAY_KEY || '' },
        body: JSON.stringify({ key: process.env.MAIL_RELAY_KEY || '', to, subject, html }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) console.log('Email (cPanel) imeshindwa:', r.status, JSON.stringify(j));
      return r.ok && !!j.ok;
    }
    if (process.env.BREVO_API_KEY) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json', 'api-key': process.env.BREVO_API_KEY },
        body: JSON.stringify({ sender: { name: '88EST', email: from }, to: [{ email: to }], subject, htmlContent: html }),
      });
      if (!r.ok) console.log('Email (Brevo) imeshindwa:', r.status, await r.text());
      return r.ok;
    }
  } catch (e) {
    console.log('Email imeshindwa:', e.message);
    return false;
  }
  console.log('[Email haijawekwa] Kwa ' + to + ': ' + subject);
  return false;
}

// ===== Cloudflare Turnstile (kuzuia bots) =====
// Weka TURNSTILE_SITE_KEY na TURNSTILE_SECRET_KEY kwenye Railway. Bila hizo, ukaguzi huu unarukwa.
async function verifyCaptcha(req) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  const token = String(req.body.captcha || '');
  need(token, 'Subiri uthibitisho wa usalama ukamilike, kisha jaribu tena.');
  let ok = false;
  try {
    const r = await fetch(process.env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }).toString(),
    });
    const j = await r.json();
    ok = !!j.success;
    if (!ok) console.log('Turnstile imekataa:', JSON.stringify(j['error-codes'] || []));
  } catch (e) {
    console.log('Turnstile haipatikani:', e.message);
  }
  need(ok, 'Uthibitisho wa usalama umeshindwa. Jaribu tena.');
}

// Kuzuia mtu kujaribu mara nyingi sana (mf. kubahatisha password)
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw httpError(429, 'Umejaribu mara nyingi. Subiri kidogo kisha ujaribu tena.');
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = {
  CATEGORIES, DEALS, PERIODS, ACCOUNT_TYPES, AMENITIES, REPORT_REASONS, TERMS_VERSION, PLAN_CATEGORIES, PLOT_STATUS, cleanDetails,
  normPhone, slugify, uniqueSlug, str, int, num, bool, need, isEmail, isPro, isAdmin,
  publicSeller, selfUser, sendEmail, rateLimit, clientIp, esc, verifyCaptcha,
};
