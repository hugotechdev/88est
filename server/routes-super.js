// Routes za SUPER ADMIN (mmiliki wa 88EST): biashara, timu ya admin, kumbukumbu, msaidizi wa AI
const crypto = require('crypto');
const db = require('./db');
const { hashPassword, requireSuper } = require('./auth');
const { httpError } = require('./router');
const { log } = require('./routes-admin');
const U = require('./util');

const nums = (o) => { const r = {}; for (const k of Object.keys(o || {})) r[k] = o[k] == null ? 0 : Number(o[k]); return r; };

module.exports = function (app) {
  // ===== Muhtasari wa biashara =====
  app.get('/api/super/overview', requireSuper, async (req, res) => {
    const money = await db.one(`SELECT
        coalesce(sum(amount) FILTER (WHERE status = 'approved'), 0) AS total,
        coalesce(sum(amount) FILTER (WHERE status = 'approved' AND created_at >= date_trunc('month', now())), 0) AS this_month,
        coalesce(sum(amount) FILTER (WHERE status = 'approved' AND created_at >= date_trunc('month', now()) - interval '1 month' AND created_at < date_trunc('month', now())), 0) AS last_month,
        count(*) FILTER (WHERE status = 'approved') AS payments,
        count(*) FILTER (WHERE status = 'pending') AS pending
      FROM pro_requests`);
    const monthly = await db.q(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, sum(amount) AS amount, count(*) AS n
      FROM pro_requests WHERE status = 'approved' AND created_at > now() - interval '12 months'
      GROUP BY 1 ORDER BY 1`);
    const users = await db.one(`SELECT count(*) FILTER (WHERE role = 'seller') AS sellers,
        count(*) FILTER (WHERE plan = 'pro' AND pro_until > now()) AS pro,
        count(*) FILTER (WHERE verify_level > 0) AS verified,
        count(*) FILTER (WHERE role = 'seller' AND created_at > now() - interval '30 days') AS new30
      FROM users`);
    const listings = await db.one(`SELECT count(*) FILTER (WHERE status = 'approved') AS live,
        count(*) FILTER (WHERE created_at > now() - interval '30 days') AS new30,
        coalesce(sum(views), 0) AS views, coalesce(sum(leads_call), 0) AS calls, coalesce(sum(leads_wa), 0) AS wa
      FROM listings`);
    const daily = await db.q(`SELECT to_char(d, 'YYYY-MM-DD') AS day,
        (SELECT count(*) FROM users u WHERE u.role = 'seller' AND u.created_at::date = d::date) AS sellers,
        (SELECT count(*) FROM listings l WHERE l.created_at::date = d::date) AS listings,
        (SELECT count(*) FROM agent_logs a WHERE a.created_at::date = d::date) AS chats
      FROM generate_series(current_date - 29, current_date, interval '1 day') AS d ORDER BY d`);
    const agent = await db.one(`SELECT count(*) AS total,
        count(*) FILTER (WHERE source = 'ai') AS ai,
        count(*) FILTER (WHERE source <> 'ai') AS local,
        count(*) FILTER (WHERE created_at > now() - interval '1 day') AS today
      FROM agent_logs WHERE created_at > now() - interval '30 days'`);
    const regions = await db.q(`SELECT region, count(*) AS n FROM listings WHERE status = 'approved' GROUP BY region ORDER BY n DESC LIMIT 8`);
    const cats = await db.q(`SELECT category, count(*) AS n FROM listings WHERE status = 'approved' GROUP BY category ORDER BY n DESC`);
    res.json({
      money: nums(money),
      monthly: monthly.map((m) => ({ month: m.month, amount: Number(m.amount), n: Number(m.n) })),
      users: nums(users),
      listings: nums(listings),
      daily: daily.map((d) => ({ day: d.day, sellers: Number(d.sellers), listings: Number(d.listings), chats: Number(d.chats) })),
      agent: nums(agent),
      regions: regions.map((r) => ({ region: r.region, n: Number(r.n) })),
      categories: cats.map((r) => ({ category: r.category, n: Number(r.n) })),
      ai_key: !!process.env.ANTHROPIC_API_KEY,
      ai_model: process.env.AI_MODEL || 'claude-haiku-5-5',
    });
  });

  // ===== Timu ya admin =====
  app.get('/api/super/staff', requireSuper, async (req, res) => {
    const rows = await db.q(`SELECT u.id, u.name, u.phone, u.email, u.role, u.status, u.created_at,
        (SELECT count(*) FROM admin_logs a WHERE a.admin_id = u.id) AS actions,
        (SELECT max(created_at) FROM admin_logs a WHERE a.admin_id = u.id) AS last_action
      FROM users u WHERE u.role IN ('admin', 'superadmin') ORDER BY u.role DESC, u.created_at`);
    res.json({ items: rows.map((r) => ({ ...r, actions: Number(r.actions) })) });
  });

  app.post('/api/super/staff', requireSuper, async (req, res) => {
    const name = U.str(req.body.name, 80);
    U.need(name && name.length >= 2, 'Andika jina la mfanyakazi');
    const phone = U.normPhone(req.body.phone);
    U.need(phone, 'Namba ya simu si sahihi');
    U.need(!(await db.one('SELECT id FROM users WHERE phone = $1', [phone])), 'Namba hii tayari ina akaunti');
    const email = U.str(req.body.email, 120);
    if (email) U.need(U.isEmail(email), 'Email si sahihi');
    const password = String(req.body.password || '') || String(crypto.randomInt(10000000, 99999999));
    U.need(password.length >= 6, 'Password iwe na herufi 6 au zaidi');
    const u = await db.one(
      `INSERT INTO users(role, account_type, name, phone, phone_verified, email, email_verified, password_hash, slug)
       VALUES ('admin', 'agent', $1, $2, true, $3, true, $4, $5) RETURNING id, name, phone`,
      [name, phone, email ? email.toLowerCase() : null, hashPassword(password), 'staff-' + Date.now()]
    );
    await log(req, 'timu:ongeza', name + ' (' + phone + ')');
    res.json({ user: u, password });
  });

  app.post('/api/super/staff/:id', requireSuper, async (req, res) => {
    const id = U.int(req.params.id, 1);
    const u = await db.one("SELECT * FROM users WHERE id = $1 AND role = 'admin'", [id]);
    if (!u) throw httpError(404, 'Mfanyakazi hapatikani (super admin hawezi kubadilishwa hapa)');
    const a = req.body.action;
    let extra = {};
    if (a === 'suspend') await db.q("UPDATE users SET status = 'suspended' WHERE id = $1", [id]);
    else if (a === 'activate') await db.q("UPDATE users SET status = 'active' WHERE id = $1", [id]);
    else if (a === 'remove') await db.q('DELETE FROM users WHERE id = $1', [id]);
    else if (a === 'reset_password') {
      const pw = String(crypto.randomInt(10000000, 99999999));
      await db.q('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(pw), id]);
      extra = { password: pw };
    } else throw httpError(400, 'Kitendo si sahihi');
    await log(req, 'timu:' + a, u.name + ' (' + u.phone + ')');
    res.json({ ok: true, ...extra });
  });

  // ===== Kumbukumbu za vitendo vya admin =====
  app.get('/api/super/logs', requireSuper, async (req, res) => {
    const p = [];
    let where = 'true';
    if (req.query.q) {
      p.push('%' + String(req.query.q).slice(0, 60) + '%');
      where = '(admin_name ILIKE $1 OR action ILIKE $1 OR target ILIKE $1 OR details ILIKE $1)';
    }
    const rows = await db.q(`SELECT * FROM admin_logs WHERE ${where} ORDER BY created_at DESC LIMIT 300`, p);
    res.json({ items: rows });
  });

  // ===== Maswali ya wateja kwa msaidizi =====
  app.get('/api/super/agent-logs', requireSuper, async (req, res) => {
    const rows = await db.q('SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT 300');
    res.json({ items: rows.map((r) => ({ ...r, results: r.results == null ? null : Number(r.results) })) });
  });
};
