// Routes za admin (HUGO TECH): kupitisha matangazo, watumiaji, uthibitisho, Pro, ripoti, mipangilio
const crypto = require('crypto');
const db = require('./db');
const { hashPassword, sign, requireAdmin, requireSuper } = require('./auth');
const { httpError } = require('./router');
const U = require('./util');

// Kumbukumbu ya kila kitendo cha admin (super admin anaiona)
async function log(req, action, target, details) {
  try {
    await db.q('INSERT INTO admin_logs(admin_id, admin_name, action, target, details) VALUES ($1, $2, $3, $4, $5)', [
      req.user.id, req.user.name, action, target ? String(target).slice(0, 200) : null, details ? String(details).slice(0, 500) : null,
    ]);
  } catch (e) { /* kumbukumbu isizuie kazi */ }
}

module.exports = function (app) {
  // ===== Muhtasari =====
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    const u = await db.one(`SELECT count(*) FILTER (WHERE role = 'seller') AS sellers,
        count(*) FILTER (WHERE role = 'seller' AND account_type = 'agent') AS agents,
        count(*) FILTER (WHERE role = 'seller' AND account_type = 'developer') AS developers,
        count(*) FILTER (WHERE role = 'seller' AND account_type = 'owner') AS owners,
        count(*) FILTER (WHERE role = 'seller' AND created_at > now() - interval '7 days') AS new_week,
        count(*) FILTER (WHERE plan = 'pro' AND pro_until > now()) AS pro,
        count(*) FILTER (WHERE verify_level > 0) AS verified
      FROM users`);
    const l = await db.one(`SELECT count(*) FILTER (WHERE status = 'pending') AS pending,
        count(*) FILTER (WHERE status = 'approved') AS approved,
        count(*) FILTER (WHERE status = 'hidden') AS hidden,
        count(*) FILTER (WHERE status = 'taken') AS taken,
        coalesce(sum(views), 0) AS views, coalesce(sum(leads_call + leads_wa), 0) AS leads
      FROM listings`);
    const o = await db.one(`SELECT (SELECT count(*) FROM verifications WHERE status = 'pending') AS verifications,
        (SELECT count(*) FROM pro_requests WHERE status = 'pending') AS pro_requests,
        (SELECT count(*) FROM reports WHERE status = 'open') AS reports`);
    const out = {};
    for (const obj of [u, l, o]) for (const k of Object.keys(obj)) out[k] = Number(obj[k]);
    res.json(out);
  });

  // ===== Matangazo =====
  app.get('/api/admin/listings', requireAdmin, async (req, res) => {
    const where = ['true'];
    const p = [];
    if (req.query.status) { p.push(String(req.query.status)); where.push('l.status = $' + p.length); }
    if (req.query.q) {
      p.push('%' + String(req.query.q).slice(0, 60) + '%');
      const n = '$' + p.length;
      where.push(`(l.title ILIKE ${n} OR u.name ILIKE ${n} OR u.business_name ILIKE ${n} OR u.phone ILIKE ${n} OR l.ward ILIKE ${n})`);
    }
    if (req.query.user) { p.push(U.int(req.query.user, 1)); where.push('l.user_id = $' + p.length); }
    const rows = await db.q(
      `SELECT l.*, u.name AS seller_name, u.business_name AS seller_business, u.phone AS seller_phone,
              u.verify_level AS seller_verify, u.slug AS seller_slug,
              (SELECT count(*) FROM reports r WHERE r.listing_id = l.id AND r.status = 'open') AS open_reports
       FROM listings l JOIN users u ON u.id = l.user_id WHERE ${where.join(' AND ')}
       ORDER BY CASE WHEN l.status = 'pending' THEN 0 ELSE 1 END, l.created_at ${req.query.status === 'pending' ? 'ASC' : 'DESC'} LIMIT 200`,
      p
    );
    res.json({
      items: rows.map((r) => ({
        ...r, price: Number(r.price), open_reports: Number(r.open_reports),
        featured_active: !!(r.featured && (!r.featured_until || new Date(r.featured_until) > new Date())),
      })),
    });
  });

  app.post('/api/admin/listings/:id/action', requireAdmin, async (req, res) => {
    const id = U.int(req.params.id, 1);
    const l = await db.one('SELECT id FROM listings WHERE id = $1', [id]);
    if (!l) throw httpError(404, 'Tangazo halipatikani');
    const a = req.body.action;
    if (a === 'approve' || a === 'restore') {
      await db.q("UPDATE listings SET status = 'approved', reject_reason = NULL WHERE id = $1", [id]);
    } else if (a === 'reject') {
      const reason = U.str(req.body.reason, 300);
      U.need(reason, 'Andika sababu ya kukataa ili muuzaji arekebishe');
      await db.q("UPDATE listings SET status = 'rejected', reject_reason = $1 WHERE id = $2", [reason, id]);
    } else if (a === 'hide') {
      await db.q("UPDATE listings SET status = 'hidden' WHERE id = $1", [id]);
    } else if (a === 'feature') {
      const days = U.int(req.body.days, 0, 365) || 0;
      if (days > 0) {
        await db.q(`UPDATE listings SET featured = true, featured_until = now() + ($1 || ' days')::interval WHERE id = $2`, [String(days), id]);
      } else {
        await db.q('UPDATE listings SET featured = false, featured_until = NULL WHERE id = $1', [id]);
      }
    } else if (a === 'delete') {
      await db.q('DELETE FROM listings WHERE id = $1', [id]);
    } else {
      throw httpError(400, 'Kitendo si sahihi');
    }
    await log(req, 'tangazo:' + a, 'Tangazo #' + id, req.body.reason || (req.body.days ? 'siku ' + req.body.days : ''));
    res.json({ ok: true });
  });

  // ===== Watumiaji =====
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const where = ["u.role = 'seller'"];
    const p = [];
    if (req.query.q) {
      p.push('%' + String(req.query.q).slice(0, 60) + '%');
      const n = '$' + p.length;
      where.push(`(u.name ILIKE ${n} OR u.business_name ILIKE ${n} OR u.phone ILIKE ${n} OR u.email ILIKE ${n} OR u.ward ILIKE ${n})`);
    }
    if (req.query.type && U.ACCOUNT_TYPES.includes(req.query.type)) { p.push(req.query.type); where.push('u.account_type = $' + p.length); }
    if (req.query.region) { p.push(String(req.query.region)); where.push('u.region = $' + p.length); }
    const rows = await db.q(
      `SELECT u.*, (SELECT count(*) FROM listings l WHERE l.user_id = u.id) AS listing_count,
              (SELECT count(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'approved') AS live_count
       FROM users u WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT ${req.query.all ? 2000 : 300}`,
      p
    );
    res.json({
      items: rows.map((u) => ({
        ...U.selfUser(u),
        listing_count: Number(u.listing_count),
        live_count: Number(u.live_count),
        // Kama email haikufika, admin anaweza kumpa mtumiaji code hii kwa simu
        otp_code: u.email_verified ? null : u.otp_code,
      })),
    });
  });

  // Admin kumsajili muuzaji kwa niaba yake
  app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const b = req.body;
    const name = U.str(b.name, 80);
    U.need(name && name.length >= 2, 'Andika jina');
    U.need(U.ACCOUNT_TYPES.includes(b.account_type), 'Chagua aina ya akaunti');
    const phone = U.normPhone(b.phone);
    U.need(phone, 'Namba ya simu si sahihi');
    U.need(!(await db.one('SELECT id FROM users WHERE phone = $1', [phone])), 'Namba hii tayari imesajiliwa');
    U.need(U.str(b.region), 'Chagua mkoa');
    U.need(U.str(b.district), 'Chagua wilaya');
    const email = U.str(b.email, 120);
    if (email) U.need(U.isEmail(email), 'Email si sahihi');
    const password = String(b.password || '') || String(crypto.randomInt(10000000, 99999999));
    U.need(password.length >= 6, 'Password iwe na herufi 6 au zaidi');
    const businessName = U.str(b.business_name, 100);
    const slug = await U.uniqueSlug(db, businessName || name);
    const u = await db.one(
      `INSERT INTO users(role, account_type, name, business_name, slug, phone, phone_verified, email, email_verified, password_hash, whatsapp, region, district, ward, service_areas)
       VALUES ('seller', $1, $2, $3, $4, $5, true, $6, true, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [b.account_type, name, businessName, slug, phone, email ? email.toLowerCase() : null, hashPassword(password),
        b.whatsapp ? U.normPhone(b.whatsapp) : null, U.str(b.region, 60), U.str(b.district, 60), U.str(b.ward, 80), U.str(b.service_areas, 300)]
    );
    await log(req, 'muuzaji:sajili', u.name + ' (' + u.phone + ')');
    res.json({ user: U.selfUser(u), password });
  });

  app.post('/api/admin/users/:id/action', requireAdmin, async (req, res) => {
    const id = U.int(req.params.id, 1);
    const u = await db.one("SELECT * FROM users WHERE id = $1 AND role = 'seller'", [id]);
    if (!u) throw httpError(404, 'Mtumiaji hapatikani');
    const a = req.body.action;
    let extra = {};
    if (a === 'verify_level') {
      const lvl = U.int(req.body.level, 0, 2);
      await db.q('UPDATE users SET verify_level = $1 WHERE id = $2', [lvl || 0, id]);
    } else if (a === 'pro') {
      const months = U.int(req.body.months, 0, 24) || 0;
      if (months > 0) {
        await db.q(`UPDATE users SET plan = 'pro', pro_until = greatest(coalesce(pro_until, now()), now()) + ($1 || ' months')::interval WHERE id = $2`, [String(months), id]);
      } else {
        await db.q("UPDATE users SET plan = 'free', pro_until = NULL WHERE id = $1", [id]);
      }
    } else if (a === 'suspend') {
      await db.q("UPDATE users SET status = 'suspended' WHERE id = $1", [id]);
    } else if (a === 'activate') {
      await db.q("UPDATE users SET status = 'active' WHERE id = $1", [id]);
    } else if (a === 'phone_verified') {
      await db.q('UPDATE users SET phone_verified = true, otp_code = NULL WHERE id = $1', [id]);
    } else if (a === 'email_verified') {
      await db.q('UPDATE users SET email_verified = true, otp_code = NULL WHERE id = $1', [id]);
    } else if (a === 'reset_password') {
      const pw = String(crypto.randomInt(10000000, 99999999));
      await db.q('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(pw), id]);
      extra = { password: pw };
    } else if (a === 'delete') {
      await db.q('DELETE FROM users WHERE id = $1', [id]);
    } else {
      throw httpError(400, 'Kitendo si sahihi');
    }
    await log(req, 'muuzaji:' + a, u.name + ' (' + u.phone + ')', req.body.level != null ? 'ngazi ' + req.body.level : req.body.months != null ? 'miezi ' + req.body.months : '');
    res.json({ ok: true, ...extra });
  });

  // Kuingia kama muuzaji (kumwekea matangazo kwa niaba yake)
  app.post('/api/admin/users/:id/impersonate', requireAdmin, async (req, res) => {
    const u = await db.one("SELECT id FROM users WHERE id = $1 AND role = 'seller'", [U.int(req.params.id, 1)]);
    if (!u) throw httpError(404, 'Mtumiaji hapatikani');
    await log(req, 'muuzaji:ingia-kama', 'Muuzaji #' + u.id);
    res.json({ token: sign({ uid: u.id, by: req.user.id }, 1) });
  });

  // ===== Uthibitisho =====
  app.get('/api/admin/verifications', requireAdmin, async (req, res) => {
    const status = req.query.status || 'pending';
    const rows = await db.q(
      `SELECT v.*, u.name, u.business_name, u.phone, u.account_type, u.region, u.district, u.verify_level
       FROM verifications v JOIN users u ON u.id = v.user_id WHERE v.status = $1 ORDER BY v.created_at ASC LIMIT 200`,
      [status]
    );
    res.json({ items: rows });
  });

  app.post('/api/admin/verifications/:id', requireAdmin, async (req, res) => {
    const v = await db.one('SELECT * FROM verifications WHERE id = $1', [U.int(req.params.id, 1)]);
    if (!v) throw httpError(404, 'Ombi halipatikani');
    if (req.body.action === 'approve') {
      const lvl = U.int(req.body.level, 1, 2) || 1;
      await db.q("UPDATE verifications SET status = 'approved', note = $1 WHERE id = $2", [U.str(req.body.note, 300), v.id]);
      await db.q('UPDATE users SET verify_level = $1 WHERE id = $2', [lvl, v.user_id]);
    } else if (req.body.action === 'reject') {
      const note = U.str(req.body.note, 300);
      U.need(note, 'Andika sababu ya kukataa');
      await db.q("UPDATE verifications SET status = 'rejected', note = $1 WHERE id = $2", [note, v.id]);
    } else {
      throw httpError(400, 'Kitendo si sahihi');
    }
    await log(req, 'uthibitisho:' + req.body.action, 'Muuzaji #' + v.user_id, req.body.note || (req.body.level ? 'ngazi ' + req.body.level : ''));
    res.json({ ok: true });
  });

  // ===== Maombi ya Pro =====
  app.get('/api/admin/pro-requests', requireAdmin, async (req, res) => {
    const rows = await db.q(
      `SELECT p.*, u.name, u.business_name, u.phone, u.verify_level, u.pro_until
       FROM pro_requests p JOIN users u ON u.id = p.user_id WHERE p.status = $1 ORDER BY p.created_at ASC LIMIT 200`,
      [req.query.status || 'pending']
    );
    res.json({ items: rows.map((r) => ({ ...r, amount: Number(r.amount) })) });
  });

  app.post('/api/admin/pro-requests/:id', requireAdmin, async (req, res) => {
    const p = await db.one('SELECT * FROM pro_requests WHERE id = $1', [U.int(req.params.id, 1)]);
    if (!p) throw httpError(404, 'Ombi halipatikani');
    U.need(p.status === 'pending', 'Ombi hili limeshashughulikiwa');
    if (req.body.action === 'approve') {
      await db.q("UPDATE pro_requests SET status = 'approved' WHERE id = $1", [p.id]);
      await db.q(`UPDATE users SET plan = 'pro', pro_until = greatest(coalesce(pro_until, now()), now()) + ($1 || ' months')::interval WHERE id = $2`, [String(p.months), p.user_id]);
    } else if (req.body.action === 'reject') {
      await db.q("UPDATE pro_requests SET status = 'rejected' WHERE id = $1", [p.id]);
    } else {
      throw httpError(400, 'Kitendo si sahihi');
    }
    await log(req, 'pro:' + req.body.action, 'Muuzaji #' + p.user_id, 'miezi ' + p.months + ', TZS ' + Number(p.amount).toLocaleString('en-US') + ', ref ' + p.reference);
    res.json({ ok: true });
  });

  // ===== Ripoti =====
  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    const rows = await db.q(
      `SELECT r.*, l.title, l.status AS listing_status, l.user_id, u.name AS seller_name, u.business_name AS seller_business, u.phone AS seller_phone
       FROM reports r JOIN listings l ON l.id = r.listing_id JOIN users u ON u.id = l.user_id
       WHERE r.status = $1 ORDER BY r.created_at DESC LIMIT 300`,
      [req.query.status || 'open']
    );
    res.json({ items: rows });
  });

  app.post('/api/admin/reports/:id', requireAdmin, async (req, res) => {
    const r = await db.one('SELECT * FROM reports WHERE id = $1', [U.int(req.params.id, 1)]);
    if (!r) throw httpError(404, 'Ripoti haipatikani');
    const a = req.body.action;
    if (a === 'dismiss') {
      // Ripoti si ya kweli: funga ripoti zote za tangazo hili na lirudishe
      await db.q("UPDATE reports SET status = 'dismissed' WHERE listing_id = $1 AND status = 'open'", [r.listing_id]);
      await db.q("UPDATE listings SET status = 'approved' WHERE id = $1 AND status = 'hidden'", [r.listing_id]);
    } else if (a === 'hide') {
      await db.q("UPDATE reports SET status = 'resolved' WHERE listing_id = $1 AND status = 'open'", [r.listing_id]);
      await db.q("UPDATE listings SET status = 'hidden' WHERE id = $1", [r.listing_id]);
    } else if (a === 'suspend') {
      const l = await db.one('SELECT user_id FROM listings WHERE id = $1', [r.listing_id]);
      await db.q("UPDATE reports SET status = 'resolved' WHERE listing_id IN (SELECT id FROM listings WHERE user_id = $1) AND status = 'open'", [l.user_id]);
      await db.q("UPDATE listings SET status = 'hidden' WHERE user_id = $1 AND status = 'approved'", [l.user_id]);
      await db.q("UPDATE users SET status = 'suspended' WHERE id = $1", [l.user_id]);
    } else {
      throw httpError(400, 'Kitendo si sahihi');
    }
    await log(req, 'ripoti:' + a, 'Tangazo #' + r.listing_id);
    res.json({ ok: true });
  });

  // ===== Ratings =====
  app.get('/api/admin/ratings', requireAdmin, async (req, res) => {
    const rows = await db.q(
      `SELECT r.*, u.name AS seller_name, u.business_name AS seller_business FROM ratings r JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json({ items: rows });
  });

  app.delete('/api/admin/ratings/:id', requireAdmin, async (req, res) => {
    await db.q('DELETE FROM ratings WHERE id = $1', [U.int(req.params.id, 1)]);
    await log(req, 'maoni:futa', 'Maoni #' + req.params.id);
    res.json({ ok: true });
  });

  // ===== Mipangilio =====
  app.get('/api/admin/settings', requireSuper, async (req, res) => {
    res.json(await db.getSettings());
  });

  app.put('/api/admin/settings', requireSuper, async (req, res) => {
    const keys = Object.keys(db.DEFAULT_SETTINGS);
    for (const k of keys) {
      if (req.body[k] === undefined) continue;
      const v = U.str(req.body[k], k === 'agent_faq' ? 6000 : 2000);
      if (k === 'review_mode') U.need(['none', 'first', 'all'].includes(v), 'Chaguo la ukaguzi si sahihi');
      if (['free_limit', 'pro_limit', 'pro_price_month', 'featured_price_week', 'agent_daily_limit'].includes(k)) {
        U.need(v !== null && /^\d+$/.test(v), 'Thamani ya ' + k + ' iwe namba');
      }
      await db.q('INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, v]);
    }
    await log(req, 'mipangilio:badilisha', Object.keys(req.body).filter((k) => keys.includes(k)).join(', '));
    res.json(await db.getSettings());
  });
};

module.exports.log = log;
