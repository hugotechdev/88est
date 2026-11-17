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
  E.REPORTS = {
    utapeli: 'Nadhani ni utapeli', picha_si_halisi: 'Picha si za mali hii', bei_si_sahihi: 'Bei si sahihi',
    imeshachukuliwa: 'Mali imeshachukuliwa', mawasiliano_hayapatikani: 'Muuzaji hapatikani', nyingine: 'Sababu nyingine',
  };
  E.STATUS = {
    pending: ['Inasubiri ukaguzi', 'st-pending'], approved: ['Iko hewani', 'st-approved'], rejected: ['Imekataliwa', 'st-rejected'],
    taken: ['Imechukuliwa', 'st-taken'], hidden: ['Imefichwa', 'st-hidden'],
  };

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
