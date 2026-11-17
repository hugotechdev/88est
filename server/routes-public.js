// Routes za umma: kutafuta matangazo, kuona madalali, ripoti na rating
const db = require('./db');
const { loadUser } = require('./auth');
const { httpError } = require('./router');
const U = require('./util');

const FEATURED_SQL = "(l.featured AND (l.featured_until IS NULL OR l.featured_until > now()))";
const SELLER_PRO_SQL = "(u.plan = 'pro' AND u.pro_until > now())";

// Sehemu za tangazo zinazotumwa kwenye orodha (cards)
const CARD_FIELDS = `l.id, l.title, l.category, l.deal, l.price, l.price_period, l.negotiable, l.region, l.district, l.ward,
  l.bedrooms, l.bathrooms, l.size, l.size_unit, l.photos, l.created_at, l.units_available, l.project_status,
  ${FEATURED_SQL} AS is_featured,
  u.name AS seller_name, u.business_name AS seller_business, u.slug AS seller_slug,
  u.verify_level AS seller_verify, u.account_type AS seller_type, ${SELLER_PRO_SQL} AS seller_pro,
  (SELECT round(avg(r.stars)::numeric, 1) FROM ratings r WHERE r.user_id = u.id) AS seller_rating,
  (SELECT count(*) FROM ratings r WHERE r.user_id = u.id) AS seller_rating_n`;

function cardRow(r) {
  const photos = Array.isArray(r.photos) ? r.photos : [];
  return {
    id: r.id, title: r.title, category: r.category, deal: r.deal,
    price: Number(r.price), price_period: r.price_period, negotiable: r.negotiable,
    region: r.region, district: r.district, ward: r.ward,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms,
    size: r.size == null ? null : Number(r.size), size_unit: r.size_unit,
    photo: photos[0] || null, photo_count: photos.length,
    units_available: r.units_available, project_status: r.project_status,
    featured: !!r.is_featured, created_at: r.created_at,
    seller: {
      name: r.seller_business || r.seller_name, slug: r.seller_slug,
      verify_level: r.seller_verify, type: r.seller_type, pro: !!r.seller_pro,
      rating: r.seller_rating == null ? null : Number(r.seller_rating), rating_count: Number(r.seller_rating_n || 0),
    },
  };
}

async function searchListings(query) {
  const where = ["l.status = 'approved'", "u.status = 'active'"];
  const p = [];
  const add = (sql, v) => { p.push(v); where.push(sql.replace('?', '$' + p.length)); };

  if (query.ids) {
    const ids = String(query.ids).split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0).slice(0, 100);
    if (!ids.length) return { items: [], total: 0 };
    add('l.id = ANY(?)', ids);
  }
  if (query.category && U.CATEGORIES.includes(query.category)) add('l.category = ?', query.category);
  if (query.deal && U.DEALS.includes(query.deal)) add('l.deal = ?', query.deal);
  if (query.region) add('l.region = ?', String(query.region));
  if (query.district) add('l.district = ?', String(query.district));
  if (query.seller) add('u.slug = ?', String(query.seller));
  const min = U.int(query.min);
  const max = U.int(query.max);
  if (min) add('l.price >= ?', min);
  if (max) add('l.price <= ?', max);
  const beds = U.int(query.beds, 0, 50);
  if (beds) add('l.bedrooms >= ?', beds);
  if (query.featured === '1') where.push(FEATURED_SQL);
  if (query.q) {
    const term = '%' + String(query.q).trim().slice(0, 60) + '%';
    p.push(term);
    const n = '$' + p.length;
    where.push(`(l.title ILIKE ${n} OR l.ward ILIKE ${n} OR l.district ILIKE ${n} OR l.region ILIKE ${n} OR l.description ILIKE ${n})`);
  }

  let order = `${FEATURED_SQL} DESC, ${SELLER_PRO_SQL} DESC, u.verify_level DESC, l.created_at DESC`;
  if (query.sort === 'price_asc') order = 'l.price ASC, l.created_at DESC';
  if (query.sort === 'price_desc') order = 'l.price DESC, l.created_at DESC';
  if (query.sort === 'new') order = 'l.created_at DESC';

  const limit = Math.min(U.int(query.limit, 1, 60) || 24, 60);
  const page = U.int(query.page, 1, 1000) || 1;
  const whereSql = where.join(' AND ');

  const countRow = await db.one(`SELECT count(*) AS n FROM listings l JOIN users u ON u.id = l.user_id WHERE ${whereSql}`, p);
  const rows = await db.q(
    `SELECT ${CARD_FIELDS} FROM listings l JOIN users u ON u.id = l.user_id WHERE ${whereSql} ORDER BY ${order} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    p
  );
  return { items: rows.map(cardRow), total: Number(countRow ? countRow.n : 0), page, limit };
}

async function sellerRating(userId) {
  const r = await db.one('SELECT round(avg(stars)::numeric, 1) AS avg, count(*) AS n FROM ratings WHERE user_id = $1', [userId]);
  return { avg: r && r.avg != null ? Number(r.avg) : null, count: Number(r ? r.n : 0) };
}

function baseUrl(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  return proto + '://' + req.headers.host;
}

function fmtPrice(n) {
  return 'TZS ' + Number(n || 0).toLocaleString('en-US');
}

module.exports = function (app) {
  // Mipangilio ya umma
  app.get('/api/config', async (req, res) => {
    const s = await db.getSettings();
    res.json({
      support_phone: s.support_phone,
      support_email: s.support_email,
      pro_price_month: Number(s.pro_price_month),
      featured_price_week: Number(s.featured_price_week),
      free_limit: Number(s.free_limit),
      pro_limit: Number(s.pro_limit),
      pay_instructions: s.pay_instructions,
    });
  });

  // Kutafuta matangazo
  app.get('/api/listings', async (req, res) => {
    res.json(await searchListings(req.query));
  });

  // Tangazo moja kwa undani
  app.get('/api/listings/:id', async (req, res) => {
    const id = U.int(req.params.id, 1);
    const l = await db.one('SELECT * FROM listings WHERE id = $1', [id]);
    if (!l) throw httpError(404, 'Tangazo halipatikani');
    const seller = await db.one('SELECT * FROM users WHERE id = $1', [l.user_id]);
    let visible = l.status === 'approved' && seller && seller.status === 'active';
    if (!visible) {
      const me = await loadUser(req);
      visible = me && (U.isAdmin(me) || me.id === l.user_id);
      if (!visible) throw httpError(404, 'Tangazo hili halipatikani tena');
    }
    if (l.status === 'approved') await db.q('UPDATE listings SET views = views + 1 WHERE id = $1', [id]);

    // Mahali pa umma ni pa kukadiria tu (karibu km 1) kwa usalama
    const round = (v) => (v == null ? null : Math.round(Number(v) * 100) / 100);
    res.json({
      id: l.id, title: l.title, category: l.category, deal: l.deal,
      price: Number(l.price), price_period: l.price_period, advance_months: l.advance_months,
      negotiable: l.negotiable, region: l.region, district: l.district, ward: l.ward,
      lat: round(l.lat), lng: round(l.lng),
      bedrooms: l.bedrooms, bathrooms: l.bathrooms,
      size: l.size == null ? null : Number(l.size), size_unit: l.size_unit,
      title_deed: l.title_deed, surveyed: l.surveyed,
      amenities: l.amenities || [], agent_fee: l.agent_fee, viewing_fee: l.viewing_fee,
      description: l.description, photos: l.photos || [],
      units_total: l.units_total, units_available: l.units_available,
      project_status: l.project_status, payment_plan: l.payment_plan,
      status: l.status, featured: !!(l.featured && (!l.featured_until || new Date(l.featured_until) > new Date())),
      views: l.views, created_at: l.created_at, updated_at: l.updated_at,
      seller: { ...U.publicSeller(seller), rating: await sellerRating(seller.id) },
    });
  });

  // Kuhesabu mteja aliyebonyeza Piga au WhatsApp
  app.post('/api/listings/:id/lead', async (req, res) => {
    const id = U.int(req.params.id, 1);
    U.rateLimit('lead:' + U.clientIp(req) + ':' + id, 5, 3600e3);
    const col = req.body.type === 'wa' ? 'leads_wa' : 'leads_call';
    await db.q(`UPDATE listings SET ${col} = ${col} + 1 WHERE id = $1 AND status = 'approved'`, [id]);
    res.json({ ok: true });
  });

  // Kuripoti tangazo
  app.post('/api/listings/:id/report', async (req, res) => {
    const id = U.int(req.params.id, 1);
    U.rateLimit('report:' + U.clientIp(req), 5, 3600e3);
    const reason = req.body.reason;
    U.need(U.REPORT_REASONS.includes(reason), 'Chagua sababu ya kuripoti');
    const l = await db.one('SELECT id FROM listings WHERE id = $1', [id]);
    if (!l) throw httpError(404, 'Tangazo halipatikani');
    await db.q('INSERT INTO reports(listing_id, reason, details, reporter_phone) VALUES ($1, $2, $3, $4)', [
      id, reason, U.str(req.body.details, 1000), U.normPhone(req.body.phone),
    ]);
    // Ripoti 3 zisizoshughulikiwa zinaficha tangazo mpaka admin aangalie
    const c = await db.one("SELECT count(*) AS n FROM reports WHERE listing_id = $1 AND status = 'open'", [id]);
    if (Number(c.n) >= 3) await db.q("UPDATE listings SET status = 'hidden' WHERE id = $1 AND status = 'approved'", [id]);
    res.json({ ok: true, message: 'Asante. Timu ya 88EST italichunguza tangazo hili.' });
  });

  // Orodha ya madalali, developers na wenye mali
  app.get('/api/sellers', async (req, res) => {
    const where = ["u.role = 'seller'", "u.status = 'active'"];
    const p = [];
    const add = (sql, v) => { p.push(v); where.push(sql.replace('?', '$' + p.length)); };
    if (req.query.type && U.ACCOUNT_TYPES.includes(req.query.type)) add('u.account_type = ?', req.query.type);
    if (req.query.region) add('u.region = ?', String(req.query.region));
    if (req.query.district) add('u.district = ?', String(req.query.district));
    if (req.query.q) {
      p.push('%' + String(req.query.q).trim().slice(0, 60) + '%');
      const n = '$' + p.length;
      where.push(`(u.name ILIKE ${n} OR u.business_name ILIKE ${n} OR u.ward ILIKE ${n} OR u.service_areas ILIKE ${n})`);
    }
    const rows = await db.q(
      `SELECT u.*, (SELECT count(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'approved') AS listing_count,
        (SELECT round(avg(stars)::numeric, 1) FROM ratings r WHERE r.user_id = u.id) AS rating
       FROM users u WHERE ${where.join(' AND ')}
       ORDER BY ${SELLER_PRO_SQL} DESC, u.verify_level DESC, listing_count DESC, u.created_at DESC LIMIT 60`,
      p
    );
    res.json({
      items: rows.map((u) => ({ ...U.publicSeller(u), listing_count: Number(u.listing_count), rating: u.rating == null ? null : Number(u.rating) })),
    });
  });

  // Ukurasa wa muuzaji (storefront)
  app.get('/api/sellers/:slug', async (req, res) => {
    const u = await db.one("SELECT * FROM users WHERE slug = $1 AND role = 'seller'", [req.params.slug]);
    if (!u || u.status !== 'active') throw httpError(404, 'Muuzaji huyu hapatikani');
    const listings = await searchListings({ seller: u.slug, limit: 60, sort: 'new' });
    const ratings = await db.q('SELECT id, stars, comment, name, created_at FROM ratings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [u.id]);
    res.json({ seller: { ...U.publicSeller(u), rating: await sellerRating(u.id) }, listings: listings.items, ratings });
  });

  // Kumpa muuzaji nyota
  app.post('/api/sellers/:slug/rate', async (req, res) => {
    U.rateLimit('rate:' + U.clientIp(req), 5, 3600e3);
    const u = await db.one("SELECT id FROM users WHERE slug = $1 AND role = 'seller' AND status = 'active'", [req.params.slug]);
    if (!u) throw httpError(404, 'Muuzaji hapatikani');
    const stars = U.int(req.body.stars, 1, 5);
    const phone = U.normPhone(req.body.phone);
    U.need(stars, 'Chagua idadi ya nyota');
    U.need(phone, 'Weka namba yako ya simu sahihi');
    const name = U.str(req.body.name, 60);
    U.need(name, 'Weka jina lako');
    await db.q(
      `INSERT INTO ratings(user_id, stars, comment, name, phone) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, phone) DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment, name = EXCLUDED.name, created_at = now()`,
      [u.id, stars, U.str(req.body.comment, 500), name, phone]
    );
    res.json({ ok: true });
  });

  // Picha
  app.get('/img/:id', async (req, res) => {
    const id = U.int(req.params.id, 1);
    const img = id && (await db.one('SELECT owner_id, data, mime, private FROM images WHERE id = $1', [id]));
    if (!img) { res.writeHead(404); return res.end(); }
    if (img.private) {
      const me = await loadUser(req);
      if (!me || (!U.isAdmin(me) && me.id !== img.owner_id)) { res.writeHead(403); return res.end(); }
    }
    const data = Buffer.isBuffer(img.data) ? img.data : Buffer.from(img.data);
    res.writeHead(200, {
      'Content-Type': img.mime,
      'Content-Length': data.length,
      'Cache-Control': img.private ? 'private, no-store' : 'public, max-age=2592000, immutable',
    });
    res.end(data);
  });

  // Link za kushare (zinaonyesha picha na bei kwenye WhatsApp/Facebook)
  app.get('/l/:id', async (req, res) => {
    const id = U.int(req.params.id, 1);
    const l = id && (await db.one("SELECT id, title, price, price_period, region, district, ward, photos FROM listings WHERE id = $1 AND status = 'approved'", [id]));
    if (!l) return res.redirect('/');
    const base = baseUrl(req);
    const photo = (l.photos || [])[0];
    const per = { month: ' kwa mwezi', year: ' kwa mwaka', night: ' kwa usiku', day: ' kwa siku', total: '' }[l.price_period] || '';
    const desc = fmtPrice(l.price) + per + ' · ' + [l.ward, l.district, l.region].filter(Boolean).join(', ');
    res.html(sharePage(base, '/#/l/' + l.id, l.title + ' | 88EST', desc, photo ? base + '/img/' + photo : base + '/og.png'));
  });

  app.get('/a/:slug', async (req, res) => {
    const u = await db.one("SELECT name, business_name, slug, region, district, avatar_id FROM users WHERE slug = $1 AND role = 'seller' AND status = 'active'", [req.params.slug]);
    if (!u) return res.redirect('/');
    const base = baseUrl(req);
    const name = u.business_name || u.name;
    res.html(sharePage(base, '/#/a/' + u.slug, name + ' | 88EST', 'Angalia mali za ' + name + ' (' + [u.district, u.region].filter(Boolean).join(', ') + ') kwenye 88EST', u.avatar_id ? base + '/img/' + u.avatar_id : base + '/og.png'));
  });
};

function sharePage(base, target, title, desc, image) {
  const e = U.esc;
  return `<!doctype html><html lang="sw"><head><meta charset="utf-8">
<title>${e(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:image" content="${e(image)}">
<meta property="og:url" content="${e(base + target)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${e(target)}">
</head><body style="font-family:sans-serif;background:#1F2125;color:#F4F4F2">
<p style="padding:24px">Inafungua 88EST... <a style="color:#C9A24A" href="${e(target)}">Bonyeza hapa</a></p>
<script>location.replace(${JSON.stringify(target)});</script>
</body></html>`;
}

module.exports.searchListings = searchListings;
