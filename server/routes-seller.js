// Routes za wauzaji: kujisajili, login, wasifu, matangazo, uthibitisho na Pro
const crypto = require('crypto');
const db = require('./db');
const { hashPassword, checkPassword, sign, requireAuth } = require('./auth');
const { httpError } = require('./router');
const U = require('./util');

async function limits(user) {
  const s = await db.getSettings();
  if (U.isAdmin(user)) return { max: 100000, used: 0 };
  const max = U.isPro(user) ? Number(s.pro_limit) : Number(s.free_limit);
  const r = await db.one("SELECT count(*) AS n FROM listings WHERE user_id = $1 AND status IN ('pending', 'approved', 'hidden')", [user.id]);
  return { max, used: Number(r.n) };
}

async function meResponse(u) {
  const lim = await limits(u);
  const pendingVer = await db.one("SELECT id FROM verifications WHERE user_id = $1 AND status = 'pending' LIMIT 1", [u.id]);
  return { user: U.selfUser(u), limits: lim, verification_pending: !!pendingVer };
}

function newOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendOtp(u) {
  if (u.otp_sent_at && Date.now() - new Date(u.otp_sent_at).getTime() < 60e3) {
    throw httpError(429, 'Subiri dakika 1 kabla ya kuomba code nyingine.');
  }
  const code = newOtp();
  await db.q("UPDATE users SET otp_code = $1, otp_expires = now() + interval '30 minutes', otp_sent_at = now() WHERE id = $2", [code, u.id]);
  return U.sendEmail(u.email, 'Code yako ya 88EST: ' + code, 'Code yako ya uthibitisho',
    `<p>Habari ${U.esc(u.name)},</p><p>Tumia code hii kwenye 88EST:</p>
     <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1F2125;background:#F6EEDB;border-radius:12px;padding:14px;text-align:center">${code}</div>
     <p style="color:#6B7078;font-size:13px">Code itaisha baada ya dakika 30. Kama hukuomba code hii, puuza ujumbe huu.</p>`);
}

// Taarifa za tangazo kutoka kwenye fomu - zinahakikiwa hapa
async function listingFromBody(b, user) {
  const title = U.str(b.title, 120);
  U.need(title && title.length >= 5, 'Andika kichwa cha tangazo (angalau herufi 5)');
  U.need(U.CATEGORIES.includes(b.category), 'Chagua aina ya mali');
  let deal = b.category === 'short_stay' ? 'short' : b.deal;
  U.need(U.DEALS.includes(deal), 'Chagua kama ni kupangisha au kuuza');
  const price = U.int(b.price, 0, 1e13);
  U.need(price !== null, 'Weka bei kwa TZS');
  let period = b.price_period;
  if (deal === 'sale') period = 'total';
  U.need(U.PERIODS.includes(period), 'Chagua bei ni kwa mwezi, mwaka au usiku');
  U.need(U.str(b.region), 'Chagua mkoa');
  U.need(U.str(b.district), 'Chagua wilaya');

  const photos = (Array.isArray(b.photos) ? b.photos : []).map((x) => parseInt(x, 10)).filter((x) => x > 0).slice(0, 12);
  U.need(photos.length >= 1, 'Weka angalau picha 1 ya mali');
  const owned = await db.q('SELECT id FROM images WHERE id = ANY($1) AND owner_id = $2 AND private = false', [photos, user.id]);
  const ownedIds = new Set(owned.map((r) => r.id));
  const goodPhotos = photos.filter((id) => ownedIds.has(id));
  U.need(goodPhotos.length >= 1, 'Picha hazikupakiwa vizuri. Jaribu kuziweka tena.');

  const amenities = (Array.isArray(b.amenities) ? b.amenities : []).filter((a) => U.AMENITIES.includes(a));
  const lat = U.num(b.lat);
  const lng = U.num(b.lng);
  const okLoc = lat !== null && lng !== null && lat > -12.5 && lat < -0.5 && lng > 29 && lng < 41;

  return {
    title, category: b.category, deal, price, price_period: period,
    advance_months: deal === 'rent' ? U.int(b.advance_months, 0, 36) : null,
    negotiable: !!U.bool(b.negotiable),
    region: U.str(b.region, 60), district: U.str(b.district, 60), ward: U.str(b.ward, 80),
    lat: okLoc ? lat : null, lng: okLoc ? lng : null,
    bedrooms: U.int(b.bedrooms, 0, 100), bathrooms: U.int(b.bathrooms, 0, 100),
    size: U.num(b.size), size_unit: U.str(b.size_unit, 20),
    title_deed: U.bool(b.title_deed), surveyed: U.bool(b.surveyed),
    amenities: JSON.stringify(amenities),
    agent_fee: U.str(b.agent_fee, 200), viewing_fee: U.str(b.viewing_fee, 200),
    description: U.str(b.description, 4000),
    photos: JSON.stringify(goodPhotos),
    units_total: U.int(b.units_total, 0, 100000), units_available: U.int(b.units_available, 0, 100000),
    project_status: U.str(b.project_status, 40), payment_plan: U.str(b.payment_plan, 1000),
  };
}

const LISTING_COLS = ['title', 'category', 'deal', 'price', 'price_period', 'advance_months', 'negotiable', 'region', 'district', 'ward', 'lat', 'lng', 'bedrooms', 'bathrooms', 'size', 'size_unit', 'title_deed', 'surveyed', 'amenities', 'agent_fee', 'viewing_fee', 'description', 'photos', 'units_total', 'units_available', 'project_status', 'payment_plan'];

function myListingRow(l) {
  return {
    ...l,
    price: Number(l.price),
    size: l.size == null ? null : Number(l.size),
    featured: !!(l.featured && (!l.featured_until || new Date(l.featured_until) > new Date())),
  };
}

module.exports = function (app) {
  // ===== Kujisajili =====
  app.post('/api/auth/register', async (req, res) => {
    U.rateLimit('reg:' + U.clientIp(req), 10, 3600e3);
    const b = req.body;
    await U.verifyCaptcha(req);
    const name = U.str(b.name, 80);
    U.need(name && name.length >= 2, 'Andika jina lako kamili');
    U.need(U.ACCOUNT_TYPES.includes(b.account_type), 'Chagua aina ya akaunti (Dalali, Developer au Mwenye mali)');
    const phone = U.normPhone(b.phone);
    U.need(phone, 'Namba ya simu si sahihi. Mfano: 0712345678');
    const email = U.str(b.email, 120);
    U.need(U.isEmail(email), 'Email si sahihi');
    U.need(String(b.password || '').length >= 6, 'Password iwe na herufi 6 au zaidi');
    U.need(U.str(b.region), 'Chagua mkoa unaopatikana');
    U.need(U.str(b.district), 'Chagua wilaya unayopatikana');
    const exists = await db.one('SELECT id FROM users WHERE phone = $1', [phone]);
    U.need(!exists, 'Namba hii tayari imesajiliwa. Ingia (login) badala yake.');
    const whatsapp = b.whatsapp ? U.normPhone(b.whatsapp) : null;
    const businessName = U.str(b.business_name, 100);
    const slug = await U.uniqueSlug(db, businessName || name);

    const u = await db.one(
      `INSERT INTO users(role, account_type, name, business_name, slug, phone, email, password_hash, whatsapp, region, district, ward, service_areas)
       VALUES ('seller', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [b.account_type, name, businessName, slug, phone, email.toLowerCase(), hashPassword(b.password), whatsapp,
        U.str(b.region, 60), U.str(b.district, 60), U.str(b.ward, 80), U.str(b.service_areas, 300)]
    );
    let emailSent = false;
    try { emailSent = await sendOtp(u); } catch (e) { /* si tatizo */ }
    const fresh = await db.one('SELECT * FROM users WHERE id = $1', [u.id]);
    res.json({ token: sign({ uid: u.id }), email_sent: emailSent, ...(await meResponse(fresh)) });
  });

  // ===== Kuingia =====
  app.post('/api/auth/login', async (req, res) => {
    const phone = U.normPhone(req.body.phone);
    U.need(phone, 'Weka namba ya simu sahihi');
    U.rateLimit('login:' + phone, 8, 15 * 60e3);
    await U.verifyCaptcha(req);
    const u = await db.one('SELECT * FROM users WHERE phone = $1', [phone]);
    if (!u || !checkPassword(req.body.password || '', u.password_hash)) {
      throw httpError(400, 'Namba ya simu au password si sahihi');
    }
    if (u.status === 'suspended') throw httpError(403, 'Akaunti yako imesimamishwa. Wasiliana na 88EST.');
    res.json({ token: sign({ uid: u.id }), ...(await meResponse(u)) });
  });

  // ===== Umesahau password: code inatumwa kwenye email =====
  app.post('/api/auth/forgot', async (req, res) => {
    const phone = U.normPhone(req.body.phone);
    U.need(phone, 'Weka namba ya simu uliyosajilia');
    U.rateLimit('forgot:' + phone, 4, 3600e3);
    U.rateLimit('forgotip:' + U.clientIp(req), 10, 3600e3);
    await U.verifyCaptcha(req);
    const u = await db.one("SELECT * FROM users WHERE phone = $1 AND status = 'active'", [phone]);
    let masked = null;
    if (u && u.email) {
      const code = newOtp();
      await db.q("UPDATE users SET otp_code = $1, otp_expires = now() + interval '30 minutes', otp_sent_at = now() WHERE id = $2", [code, u.id]);
      await U.sendEmail(u.email, 'Badilisha password ya 88EST: ' + code, 'Badilisha password yako',
        `<p>Habari ${U.esc(u.name)},</p><p>Mtu ameomba kubadilisha password ya akaunti yako ya 88EST. Tumia code hii:</p>
         <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1F2125;background:#F6EEDB;border-radius:12px;padding:14px;text-align:center">${code}</div>
         <p style="color:#6B7078;font-size:13px">Code itaisha baada ya dakika 30. Kama si wewe, puuza ujumbe huu; password yako haijabadilika.</p>`);
      const [nm, dom] = u.email.split('@');
      masked = nm.slice(0, 2) + '***@' + dom;
    }
    // Jibu linafanana hata kama namba haipo (kwa usalama)
    res.json({ ok: true, message: masked ? 'Tumetuma code kwenye ' + masked + '. Angalia pia Spam.' : 'Kama namba hii imesajiliwa, code imetumwa kwenye email yake.' });
  });

  app.post('/api/auth/reset', async (req, res) => {
    const phone = U.normPhone(req.body.phone);
    U.need(phone, 'Weka namba ya simu');
    U.rateLimit('reset:' + phone, 8, 15 * 60e3);
    const u = await db.one("SELECT * FROM users WHERE phone = $1 AND status = 'active'", [phone]);
    const code = String(req.body.code || '').trim();
    U.need(u && u.otp_code && code === u.otp_code && new Date(u.otp_expires) > new Date(), 'Code si sahihi au imeisha muda');
    U.need(String(req.body.password || '').length >= 6, 'Password mpya iwe na herufi 6 au zaidi');
    const nu = await db.one('UPDATE users SET password_hash = $1, otp_code = NULL, email_verified = true WHERE id = $2 RETURNING *', [hashPassword(req.body.password), u.id]);
    res.json({ token: sign({ uid: nu.id }), ...(await meResponse(nu)) });
  });

  // ===== Wasifu wangu =====
  app.get('/api/me', requireAuth, async (req, res) => {
    res.json(await meResponse(req.user));
  });

  app.put('/api/me', requireAuth, async (req, res) => {
    const b = req.body;
    const u = req.user;
    const name = U.str(b.name, 80) || u.name;
    const email = b.email !== undefined ? U.str(b.email, 120) : u.email;
    U.need(U.isEmail(email), 'Email si sahihi');
    U.need(U.str(b.region) || u.region, 'Chagua mkoa');
    const businessName = b.business_name !== undefined ? U.str(b.business_name, 100) : u.business_name;
    let slug = u.slug;
    if (businessName !== u.business_name || name !== u.name) slug = await U.uniqueSlug(db, businessName || name, u.id);
    let avatar = b.avatar_id !== undefined ? U.int(b.avatar_id, 1) : u.avatar_id;
    if (avatar && avatar !== u.avatar_id) {
      const own = await db.one('SELECT id FROM images WHERE id = $1 AND owner_id = $2 AND private = false', [avatar, u.id]);
      if (!own) avatar = u.avatar_id;
    }
    const lat = U.num(b.lat);
    const lng = U.num(b.lng);
    const okLoc = lat !== null && lng !== null && lat > -12.5 && lat < -0.5 && lng > 29 && lng < 41;
    const accountType = U.ACCOUNT_TYPES.includes(b.account_type) ? b.account_type : u.account_type;

    const nu = await db.one(
      `UPDATE users SET name = $1, business_name = $2, slug = $3, email = $4, email_verified = $5, whatsapp = $6,
        region = $7, district = $8, ward = $9, service_areas = $10, bio = $11, avatar_id = $12, lat = $13, lng = $14, account_type = $15
       WHERE id = $16 RETURNING *`,
      [name, businessName, slug, email.toLowerCase(), email.toLowerCase() === (u.email || '') ? u.email_verified : false,
        b.whatsapp !== undefined ? U.normPhone(b.whatsapp) : u.whatsapp,
        U.str(b.region, 60) || u.region, U.str(b.district, 60) || u.district,
        b.ward !== undefined ? U.str(b.ward, 80) : u.ward,
        b.service_areas !== undefined ? U.str(b.service_areas, 300) : u.service_areas,
        b.bio !== undefined ? U.str(b.bio, 1000) : u.bio,
        avatar, okLoc ? lat : b.lat === null ? null : u.lat, okLoc ? lng : b.lng === null ? null : u.lng,
        accountType, u.id]
    );
    res.json(await meResponse(nu));
  });

  app.post('/api/me/password', requireAuth, async (req, res) => {
    U.need(checkPassword(req.body.old || '', req.user.password_hash), 'Password ya zamani si sahihi');
    U.need(String(req.body.new || '').length >= 6, 'Password mpya iwe na herufi 6 au zaidi');
    await db.q('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(req.body.new), req.user.id]);
    res.json({ ok: true });
  });

  // ===== OTP ya email =====
  app.post('/api/otp/send', requireAuth, async (req, res) => {
    if (req.user.email_verified) return res.json({ ok: true, already: true });
    const sent = await sendOtp(req.user);
    res.json({
      ok: true, sent,
      message: sent ? 'Code imetumwa kwenye email yako. Angalia pia folda ya Spam.' : 'Imeshindwa kutuma email kwa sasa. Wasiliana na 88EST kupata code yako.',
    });
  });

  app.post('/api/otp/verify', requireAuth, async (req, res) => {
    U.rateLimit('otp:' + req.user.id, 8, 15 * 60e3);
    const u = await db.one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const code = String(req.body.code || '').trim();
    U.need(u.otp_code && code === u.otp_code, 'Code si sahihi');
    U.need(new Date(u.otp_expires) > new Date(), 'Code imeisha muda. Omba nyingine.');
    const nu = await db.one('UPDATE users SET email_verified = true, otp_code = NULL WHERE id = $1 RETURNING *', [u.id]);
    res.json(await meResponse(nu));
  });

  // ===== Kupakia picha =====
  app.post('/api/upload', requireAuth, async (req, res) => {
    U.rateLimit('upload:' + req.user.id, 120, 3600e3);
    const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(req.body.data || ''));
    U.need(m, 'Faili si picha. Tumia JPG au PNG.');
    const buf = Buffer.from(m[3], 'base64');
    U.need(buf.length > 100 && buf.length <= 4 * 1024 * 1024, 'Picha ni kubwa mno (mwisho MB 4)');
    const img = await db.one('INSERT INTO images(owner_id, data, mime, private) VALUES ($1, $2, $3, $4) RETURNING id', [
      req.user.id, buf, m[1], !!req.body.private,
    ]);
    res.json({ id: img.id });
  });

  // ===== Matangazo yangu =====
  app.get('/api/my/listings', requireAuth, async (req, res) => {
    const rows = await db.q('SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ items: rows.map(myListingRow) });
  });

  app.get('/api/my/listings/:id', requireAuth, async (req, res) => {
    const l = await db.one('SELECT * FROM listings WHERE id = $1 AND user_id = $2', [U.int(req.params.id, 1), req.user.id]);
    if (!l) throw httpError(404, 'Tangazo halipatikani');
    res.json(myListingRow(l));
  });

  app.post('/api/my/listings', requireAuth, async (req, res) => {
    const lim = await limits(req.user);
    U.need(lim.used < lim.max, `Umefikia kikomo cha matangazo ${lim.max}. Jiunge na Pro au ondoa matangazo yaliyokwisha.`);
    const d = await listingFromBody(req.body, req.user);
    const cols = LISTING_COLS.concat(['user_id', 'status']);
    const vals = LISTING_COLS.map((c) => d[c]).concat([req.user.id, U.isAdmin(req.user) ? 'approved' : 'pending']);
    const ph = cols.map((c, i) => '$' + (i + 1) + (c === 'amenities' || c === 'photos' ? '::jsonb' : ''));
    const l = await db.one(`INSERT INTO listings(${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`, vals);
    res.json(myListingRow(l));
  });

  app.put('/api/my/listings/:id', requireAuth, async (req, res) => {
    const id = U.int(req.params.id, 1);
    const old = await db.one('SELECT * FROM listings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!old) throw httpError(404, 'Tangazo halipatikani');
    const d = await listingFromBody(req.body, req.user);
    const sets = LISTING_COLS.map((c, i) => `${c} = $${i + 1}${c === 'amenities' || c === 'photos' ? '::jsonb' : ''}`);
    // Tangazo lililobadilishwa linakaguliwa upya (isipokuwa la admin au lililokwisha)
    let status = old.status;
    if (!U.isAdmin(req.user) && ['approved', 'rejected'].includes(old.status)) status = 'pending';
    const vals = LISTING_COLS.map((c) => d[c]).concat([status, id]);
    const l = await db.one(
      `UPDATE listings SET ${sets.join(', ')}, status = $${LISTING_COLS.length + 1}, reject_reason = NULL, updated_at = now() WHERE id = $${LISTING_COLS.length + 2} RETURNING *`,
      vals
    );
    res.json(myListingRow(l));
  });

  app.post('/api/my/listings/:id/status', requireAuth, async (req, res) => {
    const id = U.int(req.params.id, 1);
    const l = await db.one('SELECT * FROM listings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!l) throw httpError(404, 'Tangazo halipatikani');
    if (req.body.status === 'taken') {
      await db.q("UPDATE listings SET status = 'taken', updated_at = now() WHERE id = $1", [id]);
    } else if (req.body.status === 'relist') {
      U.need(l.status === 'taken', 'Tangazo hili halijawekwa kama limechukuliwa');
      const lim = await limits(req.user);
      U.need(lim.used < lim.max, `Umefikia kikomo cha matangazo ${lim.max}.`);
      await db.q(`UPDATE listings SET status = $1, updated_at = now() WHERE id = $2`, [U.isAdmin(req.user) ? 'approved' : 'pending', id]);
    } else {
      throw httpError(400, 'Hali si sahihi');
    }
    res.json({ ok: true });
  });

  app.delete('/api/my/listings/:id', requireAuth, async (req, res) => {
    const id = U.int(req.params.id, 1);
    const l = await db.one('SELECT * FROM listings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!l) throw httpError(404, 'Tangazo halipatikani');
    await db.q('DELETE FROM listings WHERE id = $1', [id]);
    const photos = (l.photos || []).map(Number).filter(Boolean);
    // Futa picha ambazo hazitumiki na tangazo lingine
    if (photos.length) {
      await db.q(
        `DELETE FROM images i WHERE i.id = ANY($1) AND i.owner_id = $2
         AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.photos @> jsonb_build_array(i.id))
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.avatar_id = i.id)`,
        [photos, req.user.id]
      );
    }
    res.json({ ok: true });
  });

  // ===== Takwimu =====
  app.get('/api/my/stats', requireAuth, async (req, res) => {
    const r = await db.one(
      `SELECT count(*) FILTER (WHERE status = 'approved') AS approved,
              count(*) FILTER (WHERE status = 'pending') AS pending,
              count(*) FILTER (WHERE status = 'rejected') AS rejected,
              count(*) FILTER (WHERE status = 'taken') AS taken,
              count(*) FILTER (WHERE status = 'hidden') AS hidden,
              coalesce(sum(views), 0) AS views,
              coalesce(sum(leads_call), 0) AS calls,
              coalesce(sum(leads_wa), 0) AS whatsapp
       FROM listings WHERE user_id = $1`,
      [req.user.id]
    );
    const out = {};
    for (const k of Object.keys(r)) out[k] = Number(r[k]);
    const rating = await db.one('SELECT round(avg(stars)::numeric, 1) AS avg, count(*) AS n FROM ratings WHERE user_id = $1', [req.user.id]);
    out.rating = rating.avg == null ? null : Number(rating.avg);
    out.rating_count = Number(rating.n);
    res.json(out);
  });

  // ===== Uthibitisho (Verified) =====
  app.get('/api/my/verification', requireAuth, async (req, res) => {
    const v = await db.one('SELECT id, status, note, created_at FROM verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    res.json({ latest: v, verify_level: req.user.verify_level, pro: !!U.isPro(req.user) });
  });

  app.post('/api/my/verification', requireAuth, async (req, res) => {
    const pending = await db.one("SELECT id FROM verifications WHERE user_id = $1 AND status = 'pending'", [req.user.id]);
    U.need(!pending, 'Ombi lako la uthibitisho bado linashughulikiwa.');
    const b = req.body;
    const nida = String(b.nida || '').replace(/\D/g, '');
    U.need(nida.length === 20, 'Namba ya NIDA iwe na tarakimu 20');
    const ids = [U.int(b.id_image, 1), U.int(b.selfie_image, 1), U.int(b.license_image, 1)].filter(Boolean);
    U.need(U.int(b.id_image, 1) && U.int(b.selfie_image, 1), 'Weka picha ya kitambulisho na selfie');
    const own = await db.q('SELECT id FROM images WHERE id = ANY($1) AND owner_id = $2', [ids, req.user.id]);
    U.need(own.length === ids.length, 'Picha hazikupakiwa vizuri. Jaribu tena.');
    await db.q('UPDATE images SET private = true WHERE id = ANY($1)', [ids]);
    await db.q('INSERT INTO verifications(user_id, nida, tin, id_image, selfie_image, license_image) VALUES ($1, $2, $3, $4, $5, $6)', [
      req.user.id, nida, U.str(b.tin, 30), U.int(b.id_image, 1), U.int(b.selfie_image, 1), U.int(b.license_image, 1),
    ]);
    res.json({ ok: true });
  });

  // ===== Pro =====
  app.get('/api/my/pro-requests', requireAuth, async (req, res) => {
    const items = await db.q('SELECT * FROM pro_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json({ items: items.map((r) => ({ ...r, amount: Number(r.amount) })) });
  });

  app.post('/api/my/pro-requests', requireAuth, async (req, res) => {
    const months = U.int(req.body.months, 1, 12);
    U.need([1, 3, 6, 12].includes(months), 'Chagua miezi 1, 3, 6 au 12');
    const reference = U.str(req.body.reference, 80);
    U.need(reference, 'Weka namba ya muamala (reference) uliyolipia');
    const pending = await db.one("SELECT id FROM pro_requests WHERE user_id = $1 AND status = 'pending'", [req.user.id]);
    U.need(!pending, 'Una ombi la Pro linalosubiri kuthibitishwa.');
    const s = await db.getSettings();
    await db.q('INSERT INTO pro_requests(user_id, months, amount, reference) VALUES ($1, $2, $3, $4)', [
      req.user.id, months, months * Number(s.pro_price_month), reference,
    ]);
    res.json({ ok: true });
  });
};

module.exports.limits = limits;
module.exports.listingFromBody = listingFromBody;
