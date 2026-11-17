// Vitu vinavyotumika na kurasa zote (app, portal, admin)
(function () {
  const E = {};

  E.CATS = [
    { k: 'nyumba', label: 'Nyumba', icon: 'ti-home' },
    { k: 'apartment', label: 'Apartment', icon: 'ti-building' },
    { k: 'chumba', label: 'Vyumba', icon: 'ti-door' },
    { k: 'kiwanja', label: 'Viwanja', icon: 'ti-map-2' },
    { k: 'shamba', label: 'Mashamba', icon: 'ti-plant-2' },
    { k: 'frame', label: 'Frame/Maduka', icon: 'ti-building-store' },
    { k: 'ofisi', label: 'Ofisi', icon: 'ti-briefcase' },
    { k: 'ghala', label: 'Maghala', icon: 'ti-building-warehouse' },
    { k: 'short_stay', label: 'Short stay', icon: 'ti-bed' },
    { k: 'ukumbi', label: 'Kumbi', icon: 'ti-confetti' },
    { k: 'mradi', label: 'Miradi', icon: 'ti-crane' },
  ];
  E.cat = (k) => E.CATS.find((c) => c.k === k) || { k, label: k, icon: 'ti-home' };
  E.LAND = ['kiwanja', 'shamba'];

  E.DEALS = { rent: 'Kupanga', sale: 'Kuuza', short: 'Short stay' };
  E.PERIODS = { month: 'mwezi', year: 'mwaka', night: 'usiku', day: 'siku', total: '' };
  E.ACCT = { agent: 'Dalali', developer: 'Developer', owner: 'Mwenye mali' };
  E.PROJECT_STATUS = { offplan: 'Off-plan (kabla ya ujenzi)', ujenzi: 'Inajengwa', imekamilika: 'Imekamilika' };
  E.AMEN = {
    maji: ['Maji', 'ti-droplet'], luku_binafsi: ['LUKU yake', 'ti-bolt'], luku_pamoja: ['LUKU ya pamoja', 'ti-bolt'],
    uzio: ['Uzio', 'ti-fence'], geti: ['Geti', 'ti-door-enter'], parking: ['Parking', 'ti-parking'],
    ulinzi: ['Mlinzi', 'ti-shield-check'], cctv: ['CCTV', 'ti-device-cctv'], fenicha: ['Fenicha', 'ti-sofa'],
    ac: ['AC', 'ti-air-conditioning'], wifi: ['WiFi', 'ti-wifi'], jiko_ndani: ['Jiko ndani', 'ti-tools-kitchen-2'],
    choo_ndani: ['Choo ndani', 'ti-bath'], tiles: ['Tiles', 'ti-grid-4x4'], gypsum: ['Gypsum', 'ti-layout-board'],
    solar: ['Solar', 'ti-solar-panel'], generator: ['Generator', 'ti-engine'], lift: ['Lift', 'ti-elevator'],
    bwawa: ['Bwawa la kuogelea', 'ti-pool'], gym: ['Gym', 'ti-barbell'], barabara_lami: ['Barabara ya lami', 'ti-road'],
    karibu_barabara: ['Karibu na barabara', 'ti-bus'], bustani: ['Bustani', 'ti-trees'], stoo: ['Stoo', 'ti-box'],
  };
  // ===== Fomu ya tangazo kwa kila aina ya mali =====
  // col = inahifadhiwa kwenye safu yake; nyingine zinahifadhiwa ndani ya "details"
  E.FIELDS = {
    bedrooms: { l: 'Vyumba vya kulala', t: 'num', col: 1, i: 'ti-bed' },
    bathrooms: { l: 'Bafu / vyoo', t: 'num', col: 1, i: 'ti-bath' },
    size: { l: 'Ukubwa', t: 'size', col: 1, i: 'ti-ruler-2' },
    title_deed: { l: 'Hati miliki ipo?', t: 'yn', col: 1 },
    surveyed: { l: 'Kimepimwa?', t: 'yn', col: 1 },
    units_total: { l: 'Units zote', t: 'num', col: 1 },
    units_available: { l: 'Units zilizobaki', t: 'num', col: 1 },
    project_status: { l: 'Hatua ya mradi', t: 'sel', col: 1, o: 'PROJECT_STATUS' },
    payment_plan: { l: 'Mpango wa malipo', t: 'area', col: 1, ph: 'Mf. 30% mwanzo, kisha awamu 6 kila mwezi' },
    room_type: { l: 'Aina ya chumba', t: 'sel', o: { self: 'Self contained', master: 'Master bedroom', single: 'Chumba kimoja (single)', sebule: 'Chumba na sebule' } },
    toilet: { l: 'Choo', t: 'sel', o: { ndani: 'Choo ndani', pamoja: 'Choo cha pamoja' } },
    furnished: { l: 'Fenicha', t: 'sel', o: { hapana: 'Hakuna fenicha', kiasi: 'Fenicha kiasi', kamili: 'Fenicha kamili' } },
    floor: { l: 'Ghorofa (floor)', t: 'num', ph: '0 = chini kabisa' },
    zoning: { l: 'Matumizi yaliyoruhusiwa', t: 'sel', o: { makazi: 'Makazi', biashara: 'Biashara', mchanganyiko: 'Makazi na biashara', viwanda: 'Viwanda', kilimo: 'Kilimo' } },
    road_access: { l: 'Barabara', t: 'sel', o: { lami: 'Barabara ya lami', changarawe: 'Changarawe / udongo', hakuna: 'Hakuna barabara bado' } },
    water_source: { l: 'Chanzo cha maji', t: 'sel', o: { bomba: 'Maji ya bomba', kisima: 'Kisima', mto: 'Mto / bwawa jirani', hakuna: 'Hakuna' } },
    current_use: { l: 'Matumizi ya sasa', t: 'text', ph: 'Mf. mahindi, korosho, pori' },
    shop_location: { l: 'Mahali ilipo', t: 'sel', o: { barabara: 'Barabara kuu', soko: 'Sokoni', mall: 'Jengo la biashara / mall', mafuta: 'Kituo cha mafuta', mtaa: 'Mtaani' } },
    rooms: { l: 'Vyumba vya ofisi', t: 'num', i: 'ti-door' },
    height: { l: 'Urefu wa ndani (mita)', t: 'num', i: 'ti-arrows-vertical' },
    truck_access: { l: 'Lori kubwa linaingia?', t: 'yn' },
    power: { l: 'Umeme', t: 'sel', o: { kawaida: 'Umeme wa kawaida', three: 'Umeme wa three-phase', hakuna: 'Hakuna umeme' } },
    guests: { l: 'Wageni (idadi ya juu)', t: 'num', i: 'ti-users' },
    capacity: { l: 'Uwezo (watu)', t: 'num', i: 'ti-users' },
    completion: { l: 'Kukamilika', t: 'text', ph: 'Mf. Desemba 2027' },
    unit_types: { l: 'Aina za units', t: 'text', ph: 'Mf. 1, 2 na 3 bedrooms' },
  };
  const AM_RES = ['maji', 'luku_binafsi', 'luku_pamoja', 'uzio', 'geti', 'parking', 'ulinzi', 'cctv', 'ac', 'wifi', 'jiko_ndani', 'choo_ndani', 'tiles', 'gypsum', 'solar', 'generator', 'bwawa', 'gym', 'bustani', 'stoo', 'barabara_lami', 'karibu_barabara'];
  E.FORMS = {
    nyumba: { deals: ['rent', 'sale'], f: ['bedrooms', 'bathrooms', 'furnished', 'size', 'title_deed'], units: ['sqm', 'futi za mraba'], am: AM_RES, ph: 'Mf. Nyumba ya vyumba 3 Mbezi Beach' },
    apartment: { deals: ['rent', 'sale'], f: ['bedrooms', 'bathrooms', 'floor', 'furnished', 'size'], units: ['sqm', 'futi za mraba'], am: AM_RES.concat(['lift']), ph: 'Mf. Apartment ya vyumba 2 Masaki' },
    chumba: { deals: ['rent'], f: ['room_type', 'toilet', 'furnished'], am: ['maji', 'luku_binafsi', 'luku_pamoja', 'uzio', 'geti', 'parking', 'ulinzi', 'tiles', 'gypsum', 'wifi', 'ac', 'jiko_ndani', 'karibu_barabara'], ph: 'Mf. Chumba self contained Sinza' },
    kiwanja: { deals: ['sale', 'rent'], f: ['size', 'title_deed', 'surveyed', 'zoning', 'road_access'], units: ['sqm', 'ekari', 'hekta'], am: ['maji', 'luku_binafsi', 'uzio', 'barabara_lami', 'karibu_barabara'], ph: 'Mf. Kiwanja sqm 600 Kigamboni' },
    shamba: { deals: ['sale', 'rent'], f: ['size', 'title_deed', 'surveyed', 'water_source', 'current_use', 'road_access'], units: ['ekari', 'hekta', 'sqm'], am: ['maji', 'luku_binafsi', 'uzio', 'karibu_barabara'], ph: 'Mf. Shamba ekari 10 Bagamoyo' },
    frame: { deals: ['rent', 'sale'], f: ['size', 'shop_location', 'floor'], units: ['sqm', 'futi za mraba'], am: ['maji', 'luku_binafsi', 'parking', 'ulinzi', 'cctv', 'choo_ndani', 'tiles', 'generator', 'stoo', 'barabara_lami', 'karibu_barabara'], ph: 'Mf. Frame ya biashara Kariakoo' },
    ofisi: { deals: ['rent', 'sale'], f: ['size', 'rooms', 'floor', 'furnished'], units: ['sqm', 'futi za mraba'], am: ['maji', 'luku_binafsi', 'parking', 'ulinzi', 'cctv', 'ac', 'wifi', 'lift', 'generator', 'choo_ndani', 'tiles', 'gypsum'], ph: 'Mf. Ofisi sqm 120 Posta' },
    ghala: { deals: ['rent', 'sale'], f: ['size', 'height', 'truck_access', 'power'], units: ['sqm', 'futi za mraba'], am: ['maji', 'uzio', 'geti', 'parking', 'ulinzi', 'cctv', 'generator', 'solar', 'choo_ndani', 'barabara_lami', 'karibu_barabara'], ph: 'Mf. Ghala sqm 1,000 Mikocheni' },
    short_stay: { deals: ['short'], f: ['bedrooms', 'bathrooms', 'guests'], am: ['wifi', 'ac', 'fenicha', 'jiko_ndani', 'choo_ndani', 'maji', 'parking', 'ulinzi', 'generator', 'solar', 'bwawa', 'gym', 'bustani'], ph: 'Mf. Apartment ya short stay Njiro' },
    ukumbi: { deals: ['rent'], periods: ['day'], f: ['capacity', 'size'], units: ['sqm'], am: ['parking', 'ac', 'generator', 'ulinzi', 'cctv', 'choo_ndani', 'wifi', 'jiko_ndani', 'bustani'], ph: 'Mf. Ukumbi wa watu 300 Sinza' },
    mradi: { deals: ['sale', 'rent'], f: ['unit_types', 'units_total', 'units_available', 'project_status', 'completion', 'title_deed', 'payment_plan'], am: AM_RES.concat(['lift']), ph: 'Mf. Amani Heights: apartments Kigamboni' },
  };
  E.optLabel = (key, v) => {
    const f = E.FIELDS[key];
    if (!f || v == null || v === '') return null;
    if (f.t === 'yn') return v === true || v === 'true' ? 'Ndiyo' : 'Hapana';
    if (key === 'floor' && Number(v) === 0) return 'Chini (ground floor)';
    if (f.t === 'sel') { const o = typeof f.o === 'string' ? E[f.o] : f.o; return (o && o[v]) || v; }
    return String(v);
  };

  E.REPORTS = {
    utapeli: 'Nadhani ni utapeli', picha_si_halisi: 'Picha si za mali hii', bei_si_sahihi: 'Bei si sahihi',
    imeshachukuliwa: 'Mali imeshachukuliwa', mawasiliano_hayapatikani: 'Muuzaji hapatikani', nyingine: 'Sababu nyingine',
  };
  E.STATUS = {
    pending: ['Inasubiri ukaguzi', 'st-pending'], approved: ['Iko hewani', 'st-approved'], rejected: ['Imekataliwa', 'st-rejected'],
    taken: ['Imechukuliwa', 'st-taken'], hidden: ['Imefichwa', 'st-hidden'],
  };

  // ===== Tafsiri yetu ya Kiingereza kwa maneno muhimu (Google inakosea baadhi, mf. "Viwanja" -> "Fields") =====
  E.isEN = () => /(?:^|;\s*)googtrans=\/[^/]*\/en\b/.test(document.cookie);
  if (E.isEN()) {
    const CAT_EN = { nyumba: 'Houses', apartment: 'Apartments', chumba: 'Rooms', kiwanja: 'Plots', shamba: 'Farms', frame: 'Shops', ofisi: 'Offices', ghala: 'Warehouses', short_stay: 'Short stay', ukumbi: 'Halls', mradi: 'Projects' };
    E.CATS.forEach((c) => { c.label = CAT_EN[c.k] || c.label; });
    E.DEALS = { rent: 'For rent', sale: 'For sale', short: 'Short stay' };
    E.PERIODS = { month: 'month', year: 'year', night: 'night', day: 'day', total: '' };
    E.ACCT = { agent: 'Agent', developer: 'Developer', owner: 'Owner' };
    E.PROJECT_STATUS = { offplan: 'Off-plan', ujenzi: 'Under construction', imekamilika: 'Completed' };
    const AM_EN = {
      maji: 'Water', luku_binafsi: 'Own electricity meter', luku_pamoja: 'Shared electricity meter', uzio: 'Fence', geti: 'Gate', parking: 'Parking',
      ulinzi: 'Security guard', cctv: 'CCTV', fenicha: 'Furnished', ac: 'Air conditioning', wifi: 'WiFi', jiko_ndani: 'Indoor kitchen',
      choo_ndani: 'Indoor toilet', tiles: 'Tiled floors', gypsum: 'Gypsum ceiling', solar: 'Solar', generator: 'Generator', lift: 'Elevator',
      bwawa: 'Swimming pool', gym: 'Gym', barabara_lami: 'Tarmac road', karibu_barabara: 'Near main road', bustani: 'Garden', stoo: 'Storeroom',
    };
    Object.keys(E.AMEN).forEach((k) => { if (AM_EN[k]) E.AMEN[k][0] = AM_EN[k]; });
    E.STATUS = { pending: ['Pending review', 'st-pending'], approved: ['Live', 'st-approved'], rejected: ['Rejected', 'st-rejected'], taken: ['Taken', 'st-taken'], hidden: ['Hidden', 'st-hidden'] };
    E._fieldsEN = {
      bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', size: 'Size', title_deed: 'Title deed available?', surveyed: 'Surveyed?', units_total: 'Total units',
      units_available: 'Units available', project_status: 'Project stage', payment_plan: 'Payment plan', room_type: 'Room type', toilet: 'Toilet',
      furnished: 'Furnishing', floor: 'Floor', zoning: 'Permitted use', road_access: 'Road access', water_source: 'Water source', current_use: 'Current use',
      shop_location: 'Location type', rooms: 'Office rooms', height: 'Inside height (m)', truck_access: 'Large truck access?', power: 'Electricity',
      guests: 'Max guests', capacity: 'Capacity (people)', completion: 'Completion', unit_types: 'Unit types',
    };
    Object.keys(E._fieldsEN).forEach((k) => { if (E.FIELDS[k]) E.FIELDS[k].l = E._fieldsEN[k]; });
    E.REPORTS = { utapeli: 'I think it is a scam', picha_si_halisi: 'Photos are not of this property', bei_si_sahihi: 'Wrong price', imeshachukuliwa: 'Already taken', mawasiliano_hayapatikani: 'Seller unreachable', nyingine: 'Other reason' };

    // Kurekebisha makosa ya Google Translate yanayojulikana
    const FIX = [
      [/\bStadiums\b/g, 'Plots'], [/\bstadiums\b/g, 'plots'], [/\bStadium\b/g, 'Plot'], [/\bstadium\b/g, 'plot'],
      [/\bFields\b/g, 'Plots'], [/\bfields\b/g, 'plots'], [/\bField\b/g, 'Plot'], [/\bfield\b/g, 'plot'],
      [/\bplayground(s?)\b/gi, 'plot$1'], [/\bGuardian\b/g, 'Security guard'], [/\bBiography\b/g, 'Profile'],
      [/\bHis\/her LUKU\b/gi, 'Own electricity meter'], [/\bJoint LUKU\b/gi, 'Shared electricity meter'], [/\bLUKU\b/g, 'electricity meter'],
      [/\bframes\b/gi, 'shops'], [/\bFrame\/Shops\b/g, 'Shops'], [/\bbroker\b/g, 'agent'], [/\bBroker\b/g, 'Agent'],
      [/Does the copyright exist\??/gi, 'Title deed available?'], [/\bcopyright\b/gi, 'title deed'],
      [/Has it been tested\??/gi, 'Is it surveyed?'], [/Has it been measured\??/gi, 'Is it surveyed?'],
      [/\bCounty \/ Street\b/g, 'Ward / Street'], [/\bCounty\b/g, 'Ward'],
      [/\bBei ya jumla\b/g, 'Total price'], [/for mutual understanding/gi, 'negotiable'], [/\bBrokerage fee\b/g, 'Agent fee'],
    ];
    const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1 };
    const fixNode = (n) => {
      const t = n.nodeValue;
      if (!t || !/[A-Za-z]/.test(t)) return;
      let v = t;
      FIX.forEach(([re, to]) => { v = v.replace(re, to); });
      if (v !== t) n.nodeValue = v;
    };
    const walk = (root) => {
      if (!root) return;
      if (root.nodeType === 3) return fixNode(root);
      if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) { if (!SKIP[n.parentNode.nodeName]) fixNode(n); }
    };
    let queued = new Set();
    const flush = () => { const q = queued; queued = new Set(); q.forEach(walk); };
    const start = () => {
      new MutationObserver((muts) => {
        muts.forEach((m) => {
          if (m.type === 'characterData') queued.add(m.target);
          m.addedNodes.forEach((n) => queued.add(n));
        });
        requestAnimationFrame(flush);
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
      walk(document.body);
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  E.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  E.money = (n) => 'TZS ' + Number(n || 0).toLocaleString('en-US');
  E.moneyShort = (n) => {
    n = Number(n || 0);
    if (n >= 1e9) return 'TZS ' + (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B';
    if (n >= 1e6) return 'TZS ' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.0', '') + 'M';
    if (n >= 1e3) return 'TZS ' + Math.round(n / 1e3) + 'K';
    return 'TZS ' + n;
  };
  E.per = (p) => (E.PERIODS[p] ? ' / ' + E.PERIODS[p] : '');
  E.img = (id, token) => (id ? '/img/' + id + (token ? '?t=' + encodeURIComponent(token) : '') : '/img-placeholder.svg');
  E.place = (o) => [o.ward, o.district, o.region].filter(Boolean).join(', ');
  E.phoneLocal = (p) => (p && p.startsWith('255') ? '0' + p.slice(3) : p || '');
  E.date = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  E.timeAgo = (d) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 3600) return 'dakika ' + Math.max(1, Math.round(s / 60)) + ' zilizopita';
    if (s < 86400) return 'saa ' + Math.round(s / 3600) + ' zilizopita';
    if (s < 86400 * 30) return 'siku ' + Math.round(s / 86400) + ' zilizopita';
    return E.date(d);
  };

  // Beji za muuzaji
  E.badges = (s) => {
    let h = '';
    if (s.verify_level >= 2) h += '<span class="badge badge-gold"><i class="ti ti-rosette-discount-check"></i> Kampuni iliyosajiliwa</span>';
    else if (s.verify_level >= 1) h += '<span class="badge badge-gold"><i class="ti ti-rosette-discount-check"></i> Verified</span>';
    if (s.pro) h += '<span class="badge badge-dark">PRO</span>';
    return h;
  };
  E.verifyIcon = (s) => (s.verify_level >= 1 ? ' <i class="ti ti-rosette-discount-check gold" title="Verified"></i>' : '');

  // Nembo ya 88EST
  E.logoIcon = (size = 36) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1F2125"/><polyline points="15,25 32,12 49,25" fill="none" stroke="#C9A24A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><text x="32" y="52" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="700" font-size="27" fill="#C9A24A">88</text></svg>`;
  E.logo = (dark = false) => `<span class="logo notranslate" translate="no">${E.logoIcon(34)}<span class="logo-text${dark ? ' on-dark' : ''}">88<b>EST</b></span></span>`;

  // Maombi kwa server
  E.tokenKey = 'est_token';
  E.token = () => localStorage.getItem(E.tokenKey) || '';
  E.api = async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    const t = opts.token !== undefined ? opts.token : E.token();
    if (t) headers.Authorization = 'Bearer ' + t;
    let r;
    try {
      r = await fetch(path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    } catch (e) {
      throw new Error('Hakuna mtandao. Angalia intaneti yako kisha ujaribu tena.');
    }
    let data = {};
    try { data = await r.json(); } catch (e) { /* hakuna json */ }
    if (!r.ok) {
      const err = new Error(data.error || 'Kuna tatizo. Jaribu tena.');
      err.status = r.status;
      throw err;
    }
    return data;
  };

  // Ujumbe mfupi chini ya skrini
  E.toast = (msg, type = '') => {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.className = 'toast show ' + type;
    el.textContent = msg;
    clearTimeout(E._tt);
    E._tt = setTimeout(() => { el.className = 'toast'; }, 3200);
  };

  // Dirisha (modal) la chini
  E.modal = (html, opts = {}) => {
    E.closeModal();
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.id = 'modal';
    wrap.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog"><button class="modal-x" aria-label="Funga" data-close><i class="ti ti-x"></i></button>${html}</div>`;
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) E.closeModal(); });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    return wrap.querySelector('.modal');
  };
  E.closeModal = () => { const m = document.getElementById('modal'); if (m) m.remove(); };
  E.confirm = (msg) => new Promise((resolve) => {
    const m = E.modal(`<h3>${E.esc(msg)}</h3><div class="row gap mt"><button class="btn btn-ghost" data-close>Hapana</button><button class="btn btn-gold" id="cfYes">Ndiyo</button></div>`);
    m.querySelector('#cfYes').onclick = () => { E.closeModal(); resolve(true); };
    m.parentElement.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === m.parentElement) resolve(false); });
  });

  // Kupunguza ukubwa wa picha kabla ya kupakia (inaokoa data ya mteja)
  E.compressImage = (file, max = 1400, quality = 0.82) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Faili hili si picha'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Imeshindwa kusoma picha'));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => reject(new Error('Picha haifunguki. Jaribu JPG au PNG.'));
      im.onload = () => {
        let { width: w, height: h } = im;
        const sc = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * sc); h = Math.round(h * sc);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(im, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
  E.upload = async (file, priv = false) => {
    const data = await E.compressImage(file, priv ? 1800 : 1400, priv ? 0.88 : 0.82);
    const r = await E.api('/api/upload', { body: { data, private: priv } });
    return r.id;
  };

  // Orodha za mikoa na wilaya kwa fomu
  E.regionOptions = (sel, any = 'Chagua mkoa') =>
    `<option value="">${any}</option>` + Object.keys(window.TZ || {}).map((r) => `<option ${r === sel ? 'selected' : ''}>${E.esc(r)}</option>`).join('');
  E.districtOptions = (region, sel, any = 'Chagua wilaya') => {
    const d = (window.TZ[region] || {}).d || [];
    return `<option value="">${any}</option>` + d.map((x) => `<option ${x === sel ? 'selected' : ''}>${E.esc(x)}</option>`).join('');
  };
  E.bindRegion = (root, regionSel, districtSel, any) => {
    const r = root.querySelector(regionSel);
    const d = root.querySelector(districtSel);
    r.addEventListener('change', () => { d.innerHTML = E.districtOptions(r.value, '', any); });
  };

  E.stars = (n) => {
    n = Math.round(Number(n || 0));
    let h = '';
    for (let i = 1; i <= 5; i++) h += `<i class="ti ti-star${i <= n ? ' on' : ''}"></i>`;
    return `<span class="stars">${h}</span>`;
  };

  E.formData = (form) => {
    const o = {};
    new FormData(form).forEach((v, k) => {
      if (o[k] !== undefined) { if (!Array.isArray(o[k])) o[k] = [o[k]]; o[k].push(v); } else o[k] = v;
    });
    return o;
  };

  E.busy = (btn, on, label) => {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + (label || 'Subiri...'); }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.label || btn.innerHTML; }
  };

  // Ramani (Leaflet)
  E.loadLeaflet = () => new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve(window.L);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  E.tiles = (L, map) => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  E.goldPin = (L) => L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });

  // ===== Cloudflare Turnstile (uthibitisho wa usalama kwenye fomu) =====
  E.config = () => E._cfgP || (E._cfgP = E.api('/api/config', { token: '' }).catch(() => { E._cfgP = null; return {}; }));
  const loadTurnstile = () => new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    let s = document.getElementById('cf-ts');
    if (!s) {
      s = document.createElement('script');
      s.id = 'cf-ts';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      document.head.appendChild(s);
    }
    const t0 = Date.now();
    const wait = () => (window.turnstile ? resolve(window.turnstile) : Date.now() - t0 > 15000 ? resolve(null) : setTimeout(wait, 150));
    wait();
  });
  // Inaweka kisanduku kwenye el; inarudisha { on, token(), reset() }
  E.captcha = async (el) => {
    const off = { on: false, token: () => '', reset() {} };
    if (!el) return off;
    const cfg = await E.config();
    if (!cfg.turnstile_site_key) return off;
    const ts = await loadTurnstile();
    if (!ts || !el.isConnected) return off;
    let tok = '';
    el.classList.add('cap');
    const id = ts.render(el, {
      sitekey: cfg.turnstile_site_key, size: 'flexible', theme: 'light',
      callback: (t) => { tok = t; }, 'expired-callback': () => { tok = ''; }, 'error-callback': () => { tok = ''; },
    });
    return { on: true, token: () => tok, reset: () => { tok = ''; try { ts.reset(id); } catch (e) { /* hakuna */ } } };
  };
  // Inahakikisha token ipo kabla ya kutuma fomu
  E.capToken = (cap) => {
    if (!cap || !cap.on) return '';
    const t = cap.token();
    if (!t) throw new Error('Subiri uthibitisho wa usalama ukamilike.');
    return t;
  };

  // ===== Lugha (Google Translate) =====
  E.LANGS = [
    ['sw', 'Kiswahili', 'SW'], ['en', 'English', 'EN'], ['fr', 'Français', 'FR'],
    ['ar', 'العربية', 'AR'], ['zh-CN', '中文', '中文'], ['hi', 'हिन्दी', 'HI'],
  ];
  E.lang = () => {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
    const code = m ? decodeURIComponent(m[1]) : 'sw';
    return E.LANGS.some((l) => l[0] === code) ? code : 'sw';
  };
  E.setLang = (code) => {
    const host = location.hostname;
    const parts = host.split('.');
    const domains = ['', host];
    if (parts.length > 2) domains.push('.' + parts.slice(-3).join('.'), '.' + parts.slice(-2).join('.'));
    const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    domains.forEach((d) => {
      const dm = d && !/^[\d.]+$/.test(host) && host !== 'localhost' ? '; domain=' + d : '';
      document.cookie = 'googtrans=; ' + expired + '; path=/' + dm;
      if (code !== 'sw') document.cookie = 'googtrans=/sw/' + code + '; path=/' + dm;
    });
    try { localStorage.setItem('est_lang', code); } catch (e) { /* hakuna */ }
    location.reload();
  };
  E.langButton = (cls = '') => {
    const cur = E.LANGS.find((l) => l[0] === E.lang());
    return `<button type="button" class="lang-btn notranslate ${cls}" translate="no" data-lang-open aria-label="Badilisha lugha"><i class="ti ti-world"></i>${cur[2]}</button>`;
  };
  E.langModal = () => {
    const cur = E.lang();
    const m = E.modal(`<h2>Chagua lugha</h2><p class="muted small">Language · Langue · اللغة</p>
      <div class="notranslate" translate="no">${E.LANGS.map(([c, n]) => `<button class="check" style="width:100%;margin-bottom:8px;justify-content:space-between;font-size:15px" data-lang="${c}"><span>${n}</span>${c === cur ? '<i class="ti ti-check gold"></i>' : ''}</button>`).join('')}</div>
      <p class="tiny muted">Tafsiri inafanywa na Google Translate.</p>`);
    m.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && b.dataset.lang !== cur) E.setLang(b.dataset.lang); else if (b) E.closeModal(); });
  };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-lang-open]')) { e.preventDefault(); E.langModal(); } });
  // Google Translate inapakiwa tu kama mtu amechagua lugha isiyo Kiswahili
  E.initTranslate = () => {
    if (E.lang() === 'sw') return;
    const div = document.createElement('div');
    div.id = 'google_translate_element';
    div.style.display = 'none';
    document.body.appendChild(div);
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({ pageLanguage: 'sw', includedLanguages: E.LANGS.map((l) => l[0]).join(','), autoDisplay: false }, 'google_translate_element');
    };
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.body.appendChild(s);
    if (E.lang() === 'ar') document.documentElement.setAttribute('dir', 'rtl');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', E.initTranslate);
  else E.initTranslate();

  window.E = E;
})();
