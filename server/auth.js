// Usalama: password, tokens na ruhusa
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'badilisha-siri-hii-kwenye-railway';

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return salt + ':' + h;
}

function checkPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, h] = stored.split(':');
  const calc = crypto.scryptSync(String(pw), salt, 64);
  const want = Buffer.from(h, 'hex');
  return want.length === calc.length && crypto.timingSafeEqual(calc, want);
}

function sign(payload, days = 30) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) {
    return null;
  }
}

async function loadUser(req) {
  const db = require('./db');
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : req.query.t || '';
  const p = verifyToken(token);
  if (!p) return null;
  const u = await db.one('SELECT * FROM users WHERE id = $1', [p.uid]);
  if (!u) return null;
  return u;
}

async function requireAuth(req, res) {
  const u = await loadUser(req);
  if (!u) return res.json({ error: 'Tafadhali ingia (login) tena.' }, 401);
  if (u.status === 'suspended') return res.json({ error: 'Akaunti yako imesimamishwa. Wasiliana na 88EST.' }, 403);
  req.user = u;
}

async function requireAdmin(req, res) {
  await requireAuth(req, res);
  if (res.writableEnded) return;
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.json({ error: 'Huna ruhusa ya kufungua hapa.' }, 403);
}

// Super admin (mmiliki wa 88EST) peke yake
async function requireSuper(req, res) {
  await requireAuth(req, res);
  if (res.writableEnded) return;
  if (req.user.role !== 'superadmin') return res.json({ error: 'Sehemu hii ni ya super admin tu.' }, 403);
}

module.exports = { hashPassword, checkPassword, sign, verifyToken, loadUser, requireAuth, requireAdmin, requireSuper };
