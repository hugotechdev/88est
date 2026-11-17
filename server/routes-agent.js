// Msaidizi wa 88EST (chat agent)
// Kanuni: majibu mafupi, kujua mteja anataka nini, kumpeleka kwenye matangazo.
// 1) Mfumo wa ndani (bure) unaelewa maswali mengi bila AI.
// 2) AI (Claude Haiku) inatumika tu ikiwa mfumo wa ndani haukuelewa.
const db = require('./db');
const U = require('./util');
const { searchListings } = require('./routes-public');

const CAT_WORDS = [
  ['short_stay', /short ?stay|airbnb|guest ?house|lodge|kwa usiku|per night|kulala siku/],
  ['mradi', /\bmradi\b|\bmiradi\b|project|off.?plan/],
  ['apartment', /apartment|apartm|\bfleti\b|\bflat\b|\bghorofa\b|condo/],
  ['kiwanja', /kiwanja|viwanja|\bplot|\bland\b/],
  ['shamba', /shamba|mashamba|\bfarm|\bheka\b/],
  ['frame', /\bframe|\bfremu|\bduka\b|\bmaduka\b|\bshop/],
  ['ofisi', /\bofisi|\boffice/],
  ['ghala', /\bghala|maghala|warehouse|godown|\bstoo\b/],
  ['ukumbi', /ukumbi|\bkumbi\b|\bhall\b|harusi|sherehe|venue/],
  ['nyumba', /\bnyumba\b|\bhouse\b|\bhome\b|villa|bungalow/],
  ['chumba', /\bchumba\b|\bvyumba\b(?!\s*\d)|\broom\b|self.?contain|master ?room/],
];
const CAT_LABEL = {
  nyumba: 'nyumba', apartment: 'apartment', chumba: 'vyumba', kiwanja: 'viwanja', shamba: 'mashamba',
  frame: 'frame/maduka', ofisi: 'ofisi', ghala: 'maghala', short_stay: 'short stay', ukumbi: 'kumbi', mradi: 'miradi ya developers',
};
const RENT = /kupanga|\bkodi\b|\bpanga\b|pangisha|\brent|kukodi|kupangisha|\blease/;
const SALE = /kununua|\bnunua\b|kuuza|inauzwa|zinauzwa|vinauzwa|linauzwa|\bbuy\b|\bsale\b|\bpurchase|for sale|kumiliki/;

const REGIONS = ['Dar es Salaam', 'Arusha', 'Dodoma', 'Pwani', 'Mwanza', 'Kilimanjaro', 'Morogoro', 'Tanga', 'Mbeya', 'Iringa', 'Geita', 'Kagera', 'Katavi', 'Kigoma', 'Lindi', 'Manyara', 'Mara', 'Mtwara', 'Njombe', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Mjini Magharibi', 'Kaskazini Unguja', 'Kusini Unguja', 'Kaskazini Pemba', 'Kusini Pemba'];
const ALIASES = { dar: ['region', 'Dar es Salaam'], dsm: ['region', 'Dar es Salaam'], 'dar es salaam': ['region', 'Dar es Salaam'], moshi: ['region', 'Kilimanjaro'], bagamoyo: ['district', 'Bagamoyo'], kibaha: ['district', 'Kibaha'], zanzibar: ['region', 'Mjini Magharibi'], znz: ['region', 'Mjini Magharibi'] };

let placeCache = { at: 0, list: [] };
async function places() {
  if (Date.now() - placeCache.at < 10 * 60e3) return placeCache.list;
  const rows = await db.q("SELECT DISTINCT region, district, ward FROM listings WHERE status = 'approved'");
  const list = [];
  const seen = new Set();
  const add = (type, name) => {
    if (!name) return;
    const key = type + ':' + name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ type, name, low: name.toLowerCase() });
  };
  REGIONS.forEach((r) => add('region', r));
  ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'].forEach((d) => add('district', d));
  rows.forEach((r) => { add('region', r.region); add('district', r.district); add('ward', r.ward); });
  list.sort((a, b) => b.low.length - a.low.length);
  placeCache = { at: Date.now(), list };
  return list;
}

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Kusoma bei: "laki 5", "500k", "milioni 2", "2m", "1,500,000", "elfu 50"
function parseMoney(t) {
  const out = [];
  const push = (val, idx) => { if (val >= 1000) out.push({ val: Math.round(val), idx }); };
  let m;
  const r1 = /(laki|milioni|million|bilioni|elfu)\s*(\d+(?:[.,]\d+)?)/g;
  while ((m = r1.exec(t))) {
    const n = parseFloat(m[2].replace(',', '.'));
    const mult = { laki: 1e5, elfu: 1e3, milioni: 1e6, million: 1e6, bilioni: 1e9 }[m[1]];
    push(n * mult, m.index);
  }
  const r2 = /(\d+(?:\.\d+)?)\s*(k|elfu|m|mil|ml|milioni|million|mn|b|bn|bilioni)\b/g;
  while ((m = r2.exec(t))) {
    const n = parseFloat(m[1]);
    const u = m[2];
    const mult = ['k', 'elfu'].includes(u) ? 1e3 : ['b', 'bn', 'bilioni'].includes(u) ? 1e9 : 1e6;
    if (!out.some((o) => Math.abs(o.idx - m.index) < 3)) push(n * mult, m.index);
  }
  const r3 = /\b(\d{5,})\b/g;
  while ((m = r3.exec(t))) push(Number(m[1]), m.index);
  return out.sort((a, b) => a.idx - b.idx);
}

async function understand(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/(\d),(?=\d{3}\b)/g, '$1') + ' ';
  const f = {};
  for (const [k, re] of CAT_WORDS) { if (re.test(t)) { f.category = k; break; } }
  if (f.category === 'short_stay') f.deal = 'short';
  else if (SALE.test(t)) f.deal = 'sale';
  else if (RENT.test(t)) f.deal = 'rent';

  const bm = t.match(/(\d+)\s*(?:vyumba|chumba|bedroom|bed|br|bdr)\b/) || t.match(/vyumba\s*(?:vya kulala\s*)?(\d+)/);
  if (bm && Number(bm[1]) > 0 && Number(bm[1]) < 20) f.beds = Number(bm[1]);

  const money = parseMoney(t);
  if (money.length >= 2 && /kati ya|between|\bto\b|hadi|mpaka|-/.test(t)) {
    f.min = Math.min(money[0].val, money[1].val);
    f.max = Math.max(money[0].val, money[1].val);
  } else if (money.length) {
    const before = t.slice(Math.max(0, money[0].idx - 18), money[0].idx);
    if (/kuanzia|zaidi ya|juu ya|above|from|\bmin|angalau/.test(before)) f.min = money[0].val;
    else f.max = money[0].val;
  }

  for (const [alias, [type, name]] of Object.entries(ALIASES)) {
    if (new RegExp('\\b' + reEsc(alias) + '\\b').test(t)) { f[type] = name; }
  }
  const list = await places();
  for (const p of list) {
    if (p.low.length < 3) continue;
    if (!new RegExp('\\b' + reEsc(p.low) + '\\b').test(t)) continue;
    if (p.type === 'region' && !f.region) f.region = p.name;
    else if (p.type === 'district' && !f.district) f.district = p.name;
    else if (p.type === 'ward' && !f.q && !(f.district && f.district.toLowerCase() === p.low) && !(f.region && f.region.toLowerCase() === p.low)) f.q = p.name;
  }
  return f;
}

const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.0', '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));

function describe(f) {
  const parts = [];
  parts.push(f.category ? CAT_LABEL[f.category] : 'mali');
  const cls = { chumba: 'vya', kiwanja: 'vya', shamba: 'ya', ghala: 'ya', mradi: 'ya' }[f.category] || 'za';
  if (f.deal === 'rent') parts.push(cls + ' kupanga');
  if (f.deal === 'sale') parts.push({ vya: 'vinavyouzwa', ya: 'yanayouzwa', za: 'zinazouzwa' }[cls]);
  if (f.beds) parts.push('vyumba ' + f.beds + '+');
  const where = f.q || f.district || f.region;
  if (where) parts.push(f.q ? 'eneo la ' + f.q : 'eneo la ' + where);
  if (f.max) parts.push('hadi TZS ' + fmt(f.max));
  if (f.min && !f.max) parts.push('kuanzia TZS ' + fmt(f.min));
  return parts.join(' ');
}

// Maswali yanayojibiwa bila AI
function builtInAnswer(t, s) {
  const low = ' ' + t.toLowerCase() + ' ';
  const phone = '+' + (s.support_phone || '');
  if (/^\s*(habari|mambo|hello|hi|hey|hujambo|salama|niaje|shikamoo|good (morning|afternoon|evening)|sasa)\b/.test(low.trim()) && low.trim().split(/\s+/).length <= 4) {
    return { reply: 'Karibu! Unatafuta nini, wapi, na bajeti gani?', chips: ['Nyumba ya kupanga', 'Kiwanja cha kununua', 'Short stay', 'Frame ya biashara'] };
  }
  if (/asante|thank/.test(low)) return { reply: 'Karibu sana! Ukihitaji kitu kingine, niulize tu.', chips: [] };
  if (/weka tangazo|kuweka tangazo|kutangaza|\bpost\b|nataka kupangisha|nataka kuuza|nina nyumba ya|nina kiwanja|nina frame|jisajili|kujiunga|dalali.*(jiunge|sajili)/.test(low)) {
    return { reply: 'Jisajili bure, kisha bonyeza "Weka tangazo".', link: { label: 'Fungua portal', url: '/portal.html#/register' } };
  }
  if (/\bpro\b|verified|beji|badge|kifurushi/.test(low)) {
    return { reply: `Pro ni TZS ${Number(s.pro_price_month || 0).toLocaleString('en-US')} kwa mwezi: matangazo juu, beji ya Verified na nafasi ya matangazo ${s.pro_limit}.`, link: { label: 'Jiunge na Pro', url: '/portal.html#/pro' } };
  }
  if (/utapeli|tapeli|\bscam|fraud|salama|usalama|kudanganywa/.test(low)) {
    return { reply: 'Usitume pesa kabla ya kuona mali. Pendelea wauzaji wenye Verified, na ripoti tangazo lenye shaka.', chips: [] };
  }
  if (/nawasilianaje|kumpata (dalali|muuzaji)|namba ya (dalali|muuzaji)|kumpigia/.test(low)) {
    return { reply: 'Fungua tangazo, kisha bonyeza "Piga" au "WhatsApp".', chips: [] };
  }
  if (/wasiliana na(nyi| 88est)|mawasiliano yenu|namba yenu|customer care|\bsupport\b|huduma kwa wateja/.test(low)) {
    return { reply: `Wasiliana na timu ya 88EST kwa WhatsApp ${phone} au ${s.support_email}.`, link: { label: 'WhatsApp 88EST', url: 'https://wa.me/' + (s.support_phone || '') } };
  }
  if (/ada ya udalali|commission|kamisheni/.test(low)) {
    return { reply: 'Kila muuzaji anaweka ada yake; iko kwenye "Taarifa muhimu" za tangazo.', chips: [] };
  }
  return null;
}

// Majibu maalum aliyoweka super admin: kila mstari "maneno, muhimu: jibu"
function customFaq(t, faq) {
  if (!faq) return null;
  const low = t.toLowerCase();
  for (const line of String(faq).split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const keys = line.slice(0, i).split(',').map((k) => k.trim().toLowerCase()).filter((k) => k.length > 2);
    if (keys.some((k) => low.includes(k))) return { reply: line.slice(i + 1).trim() };
  }
  return null;
}

async function runSearch(f) {
  const base = { category: f.category, deal: f.deal, region: f.region, district: f.district, q: f.q, min: f.min, max: f.max, beds: f.beds };
  const res = await runSearchInner(base);
  const used = {};
  for (const [k, v] of Object.entries(res.used)) if (v != null && v !== '' && k !== 'limit') used[k] = v;
  return { ...res, used };
}

async function runSearchInner(base0) {
  const base = { ...base0, limit: 6 };
  let r = await searchListings(base);
  if (r.total) return { r, relaxed: false, used: base };
  // Kulegeza masharti hatua kwa hatua
  const steps = [
    (b) => ({ ...b, beds: undefined }),
    (b) => ({ ...b, max: b.max ? Math.round(b.max * 1.3) : undefined }),
    (b) => ({ ...b, q: undefined }),
    (b) => ({ ...b, district: undefined }),
  ];
  let cur = base;
  for (const st of steps) {
    cur = st(cur);
    r = await searchListings(cur);
    if (r.total) return { r, relaxed: true, used: cur };
  }
  return { r, relaxed: true, used: cur };
}

function missingChips(f) {
  const c = [];
  if (!f.deal && !['kiwanja', 'shamba', 'short_stay'].includes(f.category)) c.push('Za kupanga', 'Zinazouzwa');
  if (!f.region && !f.district && !f.q) c.push('Dar es Salaam', 'Arusha', 'Dodoma');
  if (!f.max && c.length < 4) c.push('Chini ya 500K', 'Chini ya 1M');
  return c.slice(0, 4);
}

// ===== AI (Claude) - inatumika tu ikiwa mfumo wa ndani haukuelewa =====
const TOOL = {
  name: 'search_listings',
  description: 'Tafuta matangazo ya mali yaliyo hewani kwenye 88EST. Tumia mara tu unapojua angalau aina ya mali au eneo.',
  input_schema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: Object.keys(CAT_LABEL) },
      deal: { type: 'string', enum: ['rent', 'sale', 'short'] },
      region: { type: 'string', description: 'Mkoa, mf. Dar es Salaam, Arusha' },
      district: { type: 'string', description: 'Wilaya, mf. Kinondoni, Kigamboni' },
      q: { type: 'string', description: 'Mtaa au neno, mf. Sinza, Mbezi' },
      min: { type: 'integer', description: 'Bei ya chini TZS' },
      max: { type: 'integer', description: 'Bei ya juu TZS' },
      beds: { type: 'integer', description: 'Vyumba vya kulala angalau' },
    },
  },
};

async function askAI(history, text, s) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const system = `Wewe ni msaidizi wa 88EST, soko la mali Tanzania (nyumba, apartment, vyumba, viwanja, mashamba, frame, ofisi, maghala, short stay, kumbi, miradi).
KANUNI:
- Jibu kwa UFUPI: sentensi 1-2 tu, bila orodha ndefu. Tumia lugha ya mteja (Kiswahili kwa kawaida).
- Lengo ni kujua mteja anataka nini (kupanga/kununua, aina, eneo, bajeti, vyumba) na kumpeleka kwenye matangazo.
- Ukijua angalau aina au eneo, tumia search_listings mara moja. Usieleze matangazo kwa kirefu: yanaonyeshwa kama kadi chini ya jibu lako.
- Kama taarifa haitoshi, uliza SWALI MOJA tu.
- Usibuni matangazo, bei au taarifa. Mawasiliano na muuzaji ni kupitia vitufe vya Piga/WhatsApp kwenye tangazo.
- 88EST ni jukwaa la kuunganisha tu. Msaada: WhatsApp +${s.support_phone}.
${s.agent_faq ? 'Taarifa za ziada:\n' + String(s.agent_faq).slice(0, 2000) : ''}`;
  const messages = history.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text || '').slice(0, 300) }))
    .filter((m) => m.content);
  // Mazungumzo yaanze na mteja na yapishane
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const clean = [];
  for (const m of messages) { if (clean.length && clean[clean.length - 1].role === m.role) clean[clean.length - 1] = m; else clean.push(m); }
  if (clean.length && clean[clean.length - 1].role === 'user') clean.pop();
  clean.push({ role: 'user', content: String(text).slice(0, 500) });

  let found = null;
  let used = null;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-haiku-5-5', max_tokens: 220, system, tools: [TOOL], messages: clean }),
    });
    if (!r.ok) { console.log('AI imeshindwa:', r.status, (await r.text()).slice(0, 300)); return null; }
    const j = await r.json();
    const toolUse = (j.content || []).find((c) => c.type === 'tool_use');
    if (j.stop_reason === 'tool_use' && toolUse && i < 2) {
      const input = toolUse.input || {};
      const sr = await runSearch(input);
      found = sr.r.items;
      used = sr.used;
      const summary = sr.r.items.map((l) => `#${l.id} ${l.title} - TZS ${l.price} ${l.price_period} - ${[l.ward, l.district].filter(Boolean).join(', ')}`).join('\n') || 'Hakuna matangazo.';
      clean.push({ role: 'assistant', content: j.content });
      clean.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: `Matangazo ${sr.r.total}${sr.relaxed ? ' (masharti yamelegezwa)' : ''}:\n${summary}` }] });
      continue;
    }
    const reply = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(' ').trim();
    return { reply: reply || 'Niambie eneo na bajeti yako, nikutafutie.', listings: found || [], ctx: used };
  }
  return { reply: 'Haya ndiyo matangazo yanayokaribiana na unachotafuta.', listings: found || [], ctx: used };
}

module.exports = function (app) {
  app.post('/api/agent/chat', async (req, res) => {
    const s = await db.getSettings();
    if (s.agent_enabled === '0') return res.json({ reply: 'Msaidizi hapatikani kwa sasa.', listings: [] });
    const ip = U.clientIp(req);
    U.rateLimit('agent:' + ip, 80, 24 * 3600e3);
    const text = String(req.body.message || '').trim().slice(0, 500);
    U.need(text, 'Andika ujumbe');
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-6) : [];
    const rawCtx = req.body.ctx && typeof req.body.ctx === 'object' ? req.body.ctx : {};
    const ctx = {};
    for (const k of ['category', 'deal', 'region', 'district', 'q', 'min', 'max', 'beds']) {
      if (rawCtx[k] != null && rawCtx[k] !== '') ctx[k] = ['min', 'max', 'beds'].includes(k) ? U.int(rawCtx[k], 0) : String(rawCtx[k]).slice(0, 60);
    }
    const session = String(req.body.session || ip).slice(0, 60);

    let out = null;
    let source = 'faq';
    out = customFaq(text, s.agent_faq) || builtInAnswer(text, s);

    if (!out) {
      const f = await understand(text);
      const hasNew = Object.keys(f).length > 0;
      if (hasNew) {
        // Ujumbe mfupi kama "chini ya 300k" unaboresha utafutaji uliopita
        // Ujumbe mfupi (mf. kitufe "Chini ya 500K" au "Dar es Salaam") unaboresha utafutaji uliopita
        const short = text.split(/\s+/).length <= 5;
        const newCategory = f.category && ctx.category && f.category !== ctx.category;
        const refine = Object.keys(ctx).length && !newCategory && (short || (!f.category && !f.region && !f.district && !f.q));
        const merged = refine ? { ...ctx, ...f } : f;
        if (refine && f.region && !f.district) { delete merged.district; if (!f.q) delete merged.q; }
        if (refine && f.district && !f.q) delete merged.q;
        for (const k of Object.keys(merged)) if (merged[k] == null || merged[k] === '') delete merged[k];
        const { r, relaxed, used } = await runSearch(merged);
        source = 'local';
        const what = describe(merged);
        let reply;
        if (r.total && !relaxed) reply = r.total === 1 ? `Nimepata tangazo 1 la ${what}. Hili hapa:` : `Nimepata matangazo ${r.total} ya ${what}. ${r.total > 6 ? 'Haya ni bora zaidi:' : 'Haya hapa:'}`;
        else if (r.total) reply = `Hakuna yanayolingana kabisa na ${what}, lakini haya yanakaribiana:`;
        else reply = `Hakuna ${what} kwa sasa. Jaribu eneo jingine au bajeti kubwa zaidi.`;
        const chips = missingChips(merged);
        out = { reply, listings: r.items, chips, ctx: merged, more: r.total > 6 ? merged : null };
      }
    }

    if (!out) {
      // Mfumo wa ndani haukuelewa: tumia AI (ikiwa imewashwa na kikomo hakijafika)
      let ai = null;
      if (s.agent_ai_enabled !== '0' && process.env.ANTHROPIC_API_KEY) {
        try {
          U.rateLimit('agent-ai:' + ip, Number(s.agent_daily_limit || 20), 24 * 3600e3);
          ai = await askAI(history, text, s);
        } catch (e) {
          if (e.status !== 429) console.log('AI:', e.message);
        }
      }
      if (ai) {
        source = 'ai';
        out = { reply: ai.reply, listings: ai.listings, ctx: ai.ctx || ctx, chips: ai.listings.length ? [] : ['Nyumba ya kupanga', 'Kiwanja', 'Short stay'] };
      } else {
        source = 'fallback';
        out = { reply: 'Sijakuelewa. Mfano: "nyumba ya kupanga Sinza chini ya 500k".', chips: ['Nyumba ya kupanga Dar', 'Kiwanja Kigamboni', 'Short stay Arusha', 'Nawezaje kuweka tangazo?'] };
      }
    }

    try {
      await db.q('INSERT INTO agent_logs(session, question, reply, source, results) VALUES ($1, $2, $3, $4, $5)', [
        session, text, String(out.reply).slice(0, 1000), source, out.listings ? out.listings.length : null,
      ]);
    } catch (e) { /* si tatizo */ }
    res.json({ reply: out.reply, listings: out.listings || [], chips: out.chips || [], link: out.link || null, ctx: out.ctx || ctx, more: out.more || null, source });
  });
};

module.exports.understand = understand;
