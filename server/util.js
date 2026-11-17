// Vitu vya kusaidia: namba za simu, SMS, uthibitisho wa taarifa
const { httpError } = require('./router');

const CATEGORIES = ['nyumba', 'apartment', 'chumba', 'kiwanja', 'shamba', 'frame', 'ofisi', 'ghala', 'short_stay', 'ukumbi', 'mradi'];
const DEALS = ['rent', 'sale', 'short'];
const PERIODS = ['month', 'year', 'night', 'day', 'total'];
const ACCOUNT_TYPES = ['agent', 'developer', 'owner'];
const AMENITIES = ['maji', 'luku_binafsi', 'luku_pamoja', 'uzio', 'geti', 'parking', 'ulinzi', 'cctv', 'fenicha', 'ac', 'wifi', 'jiko_ndani', 'choo_ndani', 'tiles', 'gypsum', 'solar', 'generator', 'lift', 'bwawa', 'gym', 'barabara_lami', 'karibu_barabara', 'bustani', 'stoo'];
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
    status: u.status,
  };
}

// Kutuma SMS kupitia Beem Africa (ukiweka BEEM_API_KEY na BEEM_SECRET)
async function sendSMS(phone, message) {
  const key = process.env.BEEM_API_KEY;
  const secret = process.env.BEEM_SECRET;
  if (!key || !secret) {
    console.log('[SMS haijawekwa] Kwa ' + phone + ': ' + message);
    return false;
  }
  try {
    const r = await fetch('https://apisms.beem.africa/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(key + ':' + secret).toString('base64'),
      },
      body: JSON.stringify({
        source_addr: process.env.BEEM_SENDER || 'INFO',
        schedule_time: '',
        encoding: 0,
        message,
        recipients: [{ recipient_id: 1, dest_addr: phone }],
      }),
    });
    if (!r.ok) console.log('SMS imeshindwa:', r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.log('SMS imeshindwa:', e.message);
    return false;
  }
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
  CATEGORIES, DEALS, PERIODS, ACCOUNT_TYPES, AMENITIES, REPORT_REASONS,
  normPhone, slugify, uniqueSlug, str, int, num, bool, need, isEmail, isPro,
  publicSeller, selfUser, sendSMS, rateLimit, clientIp, esc,
};
