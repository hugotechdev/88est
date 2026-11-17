// 88EST - App ya watafutaji (nyumba, viwanja, frame, n.k.)
// Muonekano wa "glass" kama kwenye video ya mfano
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = E.esc;
  const view = $('#view');
  const sheet = $('#sheet');
  const sheetInner = $('#sheetInner');

  const S = {
    cfg: null,
    region: localStorage.getItem('est_region') || 'Dar es Salaam',
    category: '',
    deal: '',
    page: 1,
    lastView: '',
    installEvt: null,
    fromApp: false,
  };

  // ===== Vipendwa (vinahifadhiwa kwenye simu) =====
  const favs = {
    get() { try { return JSON.parse(localStorage.getItem('est_favs') || '[]'); } catch (e) { return []; } },
    has(id) { return this.get().includes(Number(id)); },
    toggle(id) {
      id = Number(id);
      let a = this.get();
      a = a.includes(id) ? a.filter((x) => x !== id) : [id].concat(a).slice(0, 100);
      localStorage.setItem('est_favs', JSON.stringify(a));
      return a.includes(id);
    },
  };

  const qs = (o) => Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

  // ===== Mandhari yenye ukungu (inafuata picha ya kadi iliyo mbele) =====
  let bgTurn = false;
  let bgCur = '';
  function setBg(url) {
    if (!url || url === bgCur) return;
    bgCur = url;
    const a = $('#bgA');
    const b = $('#bgB');
    const on = bgTurn ? a : b;
    const off = bgTurn ? b : a;
    on.style.backgroundImage = `url("${url}")`;
    on.classList.add('on');
    off.classList.remove('on');
    bgTurn = !bgTurn;
  }

  // ===== Kadi =====
  function favBtn(id, cls = 'gl-btn') {
    const on = favs.has(id);
    return `<button class="${cls} fav ${on ? 'on' : ''}" data-fav="${id}" aria-label="Hifadhi"><i class="ti ti-heart${on ? '-filled' : ''}"></i></button>`;
  }
  const perShort = (p) => (E.PERIODS[p] ? E.PERIODS[p] : '');
  function priceLine(l) {
    if (!l.price) return '<b>Bei kwa maelewano</b>';
    return `<b class="notranslate" translate="no">${E.moneyShort(l.price)}</b> <small>${E.per(l.price_period)}</small>`;
  }
  function facts(l) {
    const f = [];
    if (l.bedrooms) f.push(`<span><i class="ti ti-bed"></i>${l.bedrooms}</span>`);
    if (l.bathrooms) f.push(`<span><i class="ti ti-bath"></i>${l.bathrooms}</span>`);
    if (l.size) f.push(`<span><i class="ti ti-ruler-2"></i>${Number(l.size).toLocaleString('en-US')} ${esc(l.size_unit || '')}</span>`);
    if (l.plots_total) f.push(`<span><i class="ti ti-map-2"></i>${l.plots_available}/${l.plots_total} vipo</span>`);
    else if (l.category === 'mradi' && l.units_available != null) f.push(`<span><i class="ti ti-building"></i>${l.units_available} zimebaki</span>`);
    return f.length ? `<div class="facts-inline">${f.join('')}</div>` : '';
  }
  function heroCard(l) {
    const s = l.seller;
    const tag = l.featured ? '<i class="ti ti-flame"></i> Maalum'
      : s.verify_level ? '<i class="ti ti-rosette-discount-check"></i> Verified'
        : `<i class="ti ${E.cat(l.category).icon}"></i> ${esc(E.cat(l.category).label)}`;
    const rating = s.rating ? `<i class="ti ti-star-filled"></i> <b>${s.rating}</b> (maoni ${s.rating_count})` : `<i class="ti ${E.cat(l.category).icon}"></i> ${esc(E.cat(l.category).label)} · ${esc(E.DEALS[l.deal])}`;
    return `<div class="hcard" data-l="${l.id}" data-bg="${E.img(l.photo)}">
      <img src="${E.img(l.photo)}" alt="${esc(l.title)}" loading="lazy">
      <span class="tag">${tag}</span>
      ${favBtn(l.id)}
      <div class="info">
        <div style="min-width:0">
          <div class="loc"><i class="ti ti-map-pin-filled"></i>${esc(l.ward || l.district)}, ${esc(l.district && l.ward ? l.district : l.region)}</div>
          <div class="ln"><i class="ti ti-user-circle"></i>${esc(E.ACCT[s.type] || 'Muuzaji')}: <b>${esc(s.name)}</b></div>
          <div class="ln">${rating}</div>
        </div>
        <div class="price-glass"><div class="pv"><b class="notranslate" translate="no">${l.price ? E.moneyShort(l.price).replace('TZS ', '') : '—'}</b><small>${l.price ? (perShort(l.price_period) || 'TZS') : 'Maelewano'}</small></div><span class="go sm"><i class="ti ti-arrow-right"></i></span></div>
      </div>
    </div>`;
  }
  function miniCard(l) {
    return `<div class="mcard" data-l="${l.id}">
      <img src="${E.img(l.photo)}" alt="" loading="lazy">
      <div class="ov"><div style="min-width:0"><div class="t"><i class="ti ti-map-pin-filled"></i>${esc(l.ward || l.district)}</div>
        <div class="p"><span class="notranslate" translate="no">${l.price ? E.moneyShort(l.price).replace('TZS ', '') : '—'}</span> <small>${perShort(l.price_period)}</small></div></div>
        <span class="arr"><i class="ti ti-arrow-right"></i></span></div>
    </div>`;
  }
  function listCard(l) {
    return `<div class="lcard glass" data-l="${l.id}">
      <div class="ph">
        <img src="${E.img(l.photo)}" alt="${esc(l.title)}" loading="lazy">
        ${l.featured ? '<span class="ribbon gold">Maalum</span>' : `<span class="ribbon">${esc(E.DEALS[l.deal])}</span>`}
        ${favBtn(l.id)}
      </div>
      <div class="b">
        <div class="t1">${esc(l.title)}</div>
        <div class="t2"><i class="ti ti-map-pin"></i> ${esc([l.ward, l.district].filter(Boolean).join(', '))}</div>
        ${facts(l)}
        <div class="pr">${priceLine(l)}</div>
      </div>
    </div>`;
  }
  const skelHero = () => '<div class="hero"><div class="hcard skel"></div><div class="hcard skel"></div></div>';
  const skelGrid = () => '<div class="grid">' + '<div class="lcard glass"><div class="ph skel"></div><div class="skel" style="height:12px;margin-top:10px;width:70%"></div></div>'.repeat(4) + '</div>';

  // Athari ya 3D na mandhari wakati wa kuteleza kadi (kama kwenye video)
  function bindHero(el) {
    if (!el) return;
    const cards = Array.from(el.querySelectorAll('.hcard'));
    const dots = $('#dots');
    if (dots) dots.innerHTML = cards.map((_, i) => `<span class="${i === 0 ? 'on' : ''}"></span>`).join('');
    let active = -1;
    const upd = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestD = 9;
      const wide = window.innerWidth >= 900;
      cards.forEach((c, i) => {
        const cMid = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.max(-1, Math.min(1, (cMid - mid) / c.offsetWidth));
        if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
        if (wide) { c.style.transform = ''; c.style.opacity = ''; return; }
        c.style.transform = `scale(${1 - Math.abs(d) * 0.08}) rotateY(${d * -8}deg)`;
        c.style.opacity = String(1 - Math.abs(d) * 0.35);
      });
      if (best !== active) {
        active = best;
        setBg(cards[best].dataset.bg);
        if (dots) dots.querySelectorAll('span').forEach((s, i) => s.classList.toggle('on', i === best));
      }
    };
    el.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(upd));
    // Mishale ya kuteleza kwa skrini pana
    const box = el.parentElement;
    if (box && cards.length > 1 && !box.querySelector('.hero-arrow')) {
      box.style.position = 'relative';
      box.insertAdjacentHTML('beforeend', '<button class="hero-arrow l glass" aria-label="Nyuma"><i class="ti ti-chevron-left"></i></button><button class="hero-arrow r glass" aria-label="Mbele"><i class="ti ti-chevron-right"></i></button>');
      const step = () => (cards[0].offsetWidth + 14);
      box.querySelector('.hero-arrow.l').onclick = () => el.scrollBy({ left: -step(), behavior: 'smooth' });
      box.querySelector('.hero-arrow.r').onclick = () => el.scrollBy({ left: step(), behavior: 'smooth' });
    }
    upd();
  }

  function header() {
    const loggedIn = !!localStorage.getItem('est_token');
    return `<header class="top">${E.logo()}
      <div class="mid">${E.langButton('glass')}</div>
      <div class="right"><a class="me-btn glass" href="${loggedIn ? '/portal.html' : '#/akaunti'}" aria-label="Akaunti"><i class="ti ti-user"></i>${loggedIn ? '<span class="dot"></span>' : ''}</a></div>
    </header>`;
  }

  // ===== Ukurasa wa mwanzo =====
  async function home() {
    document.title = '88EST | Real estate marketplace Tanzania';
    S.page = 1;
    view.innerHTML = `
      ${header()}
      <div class="search-pill glass" id="openSearch">
        <i class="ti ti-search"></i>
        <div><div class="t1">Unatafuta wapi?</div><div class="t2">Eneo, bei au aina ya mali</div></div>
        <span class="go"><i class="ti ti-arrow-right"></i></span>
      </div>
      <div class="cats" id="cats">
        <button class="cat glass ${!S.category ? 'on' : ''}" data-cat=""><i class="ti ti-layout-grid"></i>Zote</button>
        ${E.CATS.map((c) => `<button class="cat glass ${S.category === c.k ? 'on' : ''}" data-cat="${c.k}"><i class="ti ${c.icon}"></i>${c.label.split('/')[0]}</button>`).join('')}
      </div>
      <div class="deal-tabs" id="deals">
        ${[['', 'Zote'], ['rent', 'Kupanga'], ['sale', 'Kuuza'], ['short', 'Short stay']].map(([k, t]) => `<button class="glass ${S.deal === k ? 'on' : ''}" data-deal="${k}">${t}</button>`).join('')}
      </div>
      <div id="heroBox" style="margin-top:8px">${skelHero()}</div>
      <div class="dots" id="dots"></div>
      <div class="sec-h"><h2>Karibu nawe</h2><a href="#" class="see-all glass" id="chRegion"><i class="ti ti-map-pin"></i> ${esc(S.region)}</a></div>
      <div id="nearBox"><div class="hscroll">${'<div class="mcard skel"></div>'.repeat(3)}</div></div>
      <div class="sec-h"><h2>Matangazo mapya</h2><a href="#/s?${qs({ category: S.category, deal: S.deal, sort: 'new' })}" class="see-all glass">Yote <i class="ti ti-arrow-right"></i></a></div>
      <div id="gridBox">${skelGrid()}</div>
      <div class="center" style="padding:8px 18px"><button class="btn btn-ghost glass hide" id="more">Pakia zaidi</button></div>
      ${installBar()}
      <div class="footer-note">88EST · HUGO TECH · <a href="/terms.html" style="text-decoration:underline">Terms</a> · <a href="/privacy.html" style="text-decoration:underline">Privacy</a></div>`;

    $('#openSearch').onclick = () => searchPanel({});
    $('#cats').onclick = (e) => { const b = e.target.closest('[data-cat]'); if (b) { S.category = b.dataset.cat; home(); } };
    $('#deals').onclick = (e) => { const b = e.target.closest('[data-deal]'); if (b) { S.deal = b.dataset.deal; home(); } };
    $('#chRegion').onclick = (e) => { e.preventDefault(); regionModal(); };
    bindInstall();

    const f = { category: S.category, deal: S.deal };
    try {
      const [hero, near, latest] = await Promise.all([
        E.api('/api/listings?' + qs({ ...f, limit: 8 })),
        E.api('/api/listings?' + qs({ ...f, region: S.region, limit: 12 })),
        E.api('/api/listings?' + qs({ ...f, sort: 'new', limit: 12, page: 1 })),
      ]);
      $('#heroBox').innerHTML = hero.items.length
        ? `<div class="hero" id="hero">${hero.items.map(heroCard).join('')}</div>`
        : `<div class="empty"><i class="ti ti-home-search"></i>Hakuna matangazo hapa bado.<br><a class="btn btn-gold mt" href="/portal.html">Weka tangazo</a></div>`;
      bindHero($('#hero'));
      $('#nearBox').innerHTML = near.items.length
        ? `<div class="hscroll">${near.items.map(miniCard).join('')}</div>`
        : `<div class="empty small" style="padding:14px">Hakuna matangazo ${esc(S.region)} kwa sasa.</div>`;
      $('#gridBox').innerHTML = `<div class="grid" id="grid">${latest.items.map(listCard).join('')}</div>`;
      const more = $('#more');
      more.classList.toggle('hide', latest.items.length < 12);
      more.onclick = async () => {
        E.busy(more, true);
        S.page += 1;
        const r = await E.api('/api/listings?' + qs({ ...f, sort: 'new', limit: 12, page: S.page }));
        $('#grid').insertAdjacentHTML('beforeend', r.items.map(listCard).join(''));
        E.busy(more, false);
        more.classList.toggle('hide', r.items.length < 12);
      };
    } catch (e) {
      $('#heroBox').innerHTML = `<div class="empty"><i class="ti ti-wifi-off"></i>${esc(e.message)}</div>`;
      $('#nearBox').innerHTML = '';
      $('#gridBox').innerHTML = '';
    }
  }

  function regionModal() {
    const m = E.modal(`<h2>Mkoa wako</h2>
      <select class="input" id="rgSel">${E.regionOptions(S.region)}</select>
      <button class="btn btn-gold btn-block mt" id="rgOk">Hifadhi</button>`);
    m.querySelector('#rgOk').onclick = () => {
      const v = m.querySelector('#rgSel').value;
      if (v) { S.region = v; localStorage.setItem('est_region', v); }
      E.closeModal();
      home();
    };
  }

  // ===== Paneli ya kutafuta (inafunguka kama kwenye video) =====
  function closePanel() {
    const w = $('#spanel');
    if (!w) return;
    w.classList.remove('open');
    setTimeout(() => w.remove(), 250);
  }
  function searchPanel(cur) {
    closePanel();
    const w = document.createElement('div');
    w.className = 'spanel-wrap';
    w.id = 'spanel';
    w.innerHTML = `<div class="spanel glass" style="position:relative">
      <button class="gl-btn x" style="background:rgba(31,33,37,.08);color:var(--charcoal)" data-close-panel aria-label="Funga"><i class="ti ti-x"></i></button>
      <h2>Unatafuta wapi?</h2>
      <form id="sf">
        <div class="field"><div class="search-pill" style="margin:0;padding:6px 6px 6px 16px;background:#fff"><i class="ti ti-search"></i><input name="q" style="border:0;outline:0;flex:1;background:none;font-size:15px" placeholder="Sinza, Mbezi, Njiro..." value="${esc(cur.q || '')}"></div></div>
        <div class="field"><label>Unataka</label>
          <div class="seg" style="background:rgba(255,255,255,.7)">${[['', 'Yoyote'], ['rent', 'Kupanga'], ['sale', 'Kununua'], ['short', 'Short stay']].map(([k, t]) => `<label><input type="radio" name="deal" value="${k}" ${(cur.deal || '') === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        </div>
        <div class="field"><label>Aina ya mali</label>
          <div class="cats" style="padding:0;flex-wrap:wrap" id="sCats">${[{ k: '', label: 'Zote', icon: 'ti-layout-grid' }].concat(E.CATS).map((c) => `<label class="cat glass ${(cur.category || '') === c.k ? 'on' : ''}" style="cursor:pointer"><input type="radio" name="category" value="${c.k}" ${(cur.category || '') === c.k ? 'checked' : ''} hidden><i class="ti ${c.icon}"></i>${c.label.split('/')[0]}</label>`).join('')}</div>
        </div>
        <div class="grid2">
          <div class="field"><label>Mkoa</label><select class="input" name="region" id="sReg">${E.regionOptions(cur.region, 'Mikoa yote')}</select></div>
          <div class="field"><label>Wilaya</label><select class="input" name="district" id="sDis">${E.districtOptions(cur.region, cur.district, 'Wilaya zote')}</select></div>
        </div>
        <div class="grid2">
          <div class="field"><label>Bei ya chini (TZS)</label><input class="input" name="min" inputmode="numeric" placeholder="0" value="${esc(cur.min || '')}"></div>
          <div class="field"><label>Bei ya juu (TZS)</label><input class="input" name="max" inputmode="numeric" placeholder="Yoyote" value="${esc(cur.max || '')}"></div>
        </div>
        <div class="field"><label>Vyumba vya kulala</label>
          <div class="seg" style="background:rgba(255,255,255,.7)">${['', '1', '2', '3', '4'].map((k) => `<label><input type="radio" name="beds" value="${k}" ${(cur.beds || '') === k ? 'checked' : ''}><span>${k ? k + '+' : 'Yoyote'}</span></label>`).join('')}</div>
        </div>
        <div class="row gap mt"><button type="button" class="btn btn-ghost" id="sClear" style="border-radius:26px">Futa</button>
          <button class="btn btn-gold grow" style="border-radius:26px;height:50px"><i class="ti ti-search"></i> Tafuta</button></div>
      </form></div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add('open'));
    w.addEventListener('click', (e) => { if (e.target === w || e.target.closest('[data-close-panel]')) closePanel(); });
    E.bindRegion(w, '#sReg', '#sDis', 'Wilaya zote');
    $('#sCats', w).addEventListener('change', () => {
      w.querySelectorAll('#sCats .cat').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    });
    $('#sClear', w).onclick = () => searchPanel({});
    $('#sf', w).onsubmit = (e) => {
      e.preventDefault();
      const d = E.formData(e.target);
      d.min = String(d.min || '').replace(/\D/g, '');
      d.max = String(d.max || '').replace(/\D/g, '');
      closePanel();
      location.hash = '#/s?' + qs(d);
    };
    setTimeout(() => { const q = w.querySelector('[name=q]'); if (q && !cur.q) q.focus(); }, 300);
  }

  async function searchPage(params) {
    document.title = 'Tafuta | 88EST';
    let page = 1;
    const chips = [];
    if (params.q) chips.push('"' + params.q + '"');
    if (params.deal) chips.push(E.DEALS[params.deal]);
    if (params.category) chips.push(E.cat(params.category).label);
    if (params.district) chips.push(params.district);
    if (params.region) chips.push(params.region);
    if (params.min) chips.push('Kuanzia ' + E.moneyShort(params.min));
    if (params.max) chips.push('Hadi ' + E.moneyShort(params.max));
    if (params.beds) chips.push('Vyumba ' + params.beds + '+');
    view.innerHTML = `
      <div class="page-h"><a href="#/" class="gl-btn" style="background:rgba(255,255,255,.7);color:var(--charcoal)" aria-label="Rudi"><i class="ti ti-arrow-left"></i></a><h1 class="grow">Matokeo</h1>
        <button class="btn btn-sm glass" id="edit" style="border-radius:20px"><i class="ti ti-adjustments-horizontal"></i> Chuja</button></div>
      <div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('') || '<span class="chip">Mali zote</span>'}</div>
      <div class="row between" style="padding:0 18px 8px"><span class="muted small" id="total"></span>
        <select class="input glass" id="sort" style="width:auto;padding:7px 10px;font-size:13px;border-radius:20px">
          <option value="">Zinazopendekezwa</option><option value="new">Mpya zaidi</option><option value="price_asc">Bei: chini kwenda juu</option><option value="price_desc">Bei: juu kwenda chini</option>
        </select></div>
      <div id="res">${skelGrid()}</div>
      <div class="center" style="padding:8px 18px"><button class="btn btn-ghost glass hide" id="more">Pakia zaidi</button></div>`;
    $('#sort').value = params.sort || '';
    $('#edit').onclick = () => searchPanel(params);
    $('#sort').onchange = (e) => { location.hash = '#/s?' + qs({ ...params, sort: e.target.value }); };
    try {
      const r = await E.api('/api/listings?' + qs({ ...params, limit: 24, page }));
      $('#total').textContent = r.total + ' ' + (r.total === 1 ? 'tangazo' : 'matangazo');
      if (r.items[0]) setBg(E.img(r.items[0].photo));
      $('#res').innerHTML = r.items.length
        ? `<div class="grid" id="grid">${r.items.map(listCard).join('')}</div>`
        : `<div class="empty"><i class="ti ti-mood-empty"></i>Hakuna kinacholingana. Badilisha bei au eneo.</div>`;
      const more = $('#more');
      more.classList.toggle('hide', page * 24 >= r.total);
      more.onclick = async () => {
        E.busy(more, true);
        page += 1;
        const n = await E.api('/api/listings?' + qs({ ...params, limit: 24, page }));
        $('#grid').insertAdjacentHTML('beforeend', n.items.map(listCard).join(''));
        E.busy(more, false);
        more.classList.toggle('hide', page * 24 >= n.total);
      };
    } catch (e) {
      $('#res').innerHTML = `<div class="empty"><i class="ti ti-wifi-off"></i>${esc(e.message)}</div>`;
    }
  }

  // ===== Tangazo kwa undani (kama kwenye video) =====
  async function openListing(id) {
    sheetInner.innerHTML = `<div class="gallery skel" style="border-radius:0"></div><div class="d-body"><div class="grab"></div><div class="skel" style="height:24px;width:70%"></div><div class="skel mt" style="height:14px;width:50%"></div></div>`;
    sheet.classList.add('open');
    document.body.classList.add('sheet-open');
    document.body.style.overflow = 'hidden';
    sheet.scrollTop = 0;
    let l;
    try {
      l = await E.api('/api/listings/' + id, { token: localStorage.getItem('est_admin') || E.token() });
    } catch (e) {
      sheetInner.innerHTML = `<div style="padding:16px"><button class="gl-btn" style="background:#fff;color:var(--charcoal)" data-close-sheet><i class="ti ti-arrow-left"></i></button></div><div class="empty"><i class="ti ti-home-x"></i>${esc(e.message)}</div>`;
      return;
    }
    document.title = l.title + ' | 88EST';
    const s = l.seller;
    const cat = E.cat(l.category);
    const photos = l.photos.length ? l.photos : [null];

    const factBox = [];
    if (l.bedrooms != null) factBox.push(['ti-bed', l.bedrooms + ' vyumba']);
    if (l.bathrooms != null) factBox.push(['ti-bath', l.bathrooms + ' bafu']);
    if (l.size) factBox.push(['ti-ruler-2', Number(l.size).toLocaleString('en-US') + ' ' + (l.size_unit || '')]);
    if (l.category === 'mradi' && l.units_available != null) factBox.push(['ti-building', l.units_available + ' units zimebaki']);
    if (l.surveyed && E.LAND.includes(l.category)) factBox.push(['ti-map-check', 'Kimepimwa']);
    if (l.title_deed) factBox.push(['ti-file-certificate', 'Hati ipo']);
    if (factBox.length < 3) factBox.push([cat.icon, cat.label]);
    if (factBox.length < 3) factBox.push(['ti-tag', E.DEALS[l.deal]]);

    const kv = [];
    kv.push(['Huduma', E.DEALS[l.deal]]);
    kv.push(['Bei', l.price ? E.money(l.price) + E.per(l.price_period) : 'Kwa maelewano']);
    if (l.advance_months) kv.push(['Kodi ya kulipa mbele', 'Miezi ' + l.advance_months]);
    kv.push(['Bei inajadilika', l.negotiable ? 'Ndiyo' : 'Hapana']);
    if (l.agent_fee) kv.push(['Ada ya udalali', l.agent_fee]);
    if (l.viewing_fee) kv.push(['Ada ya kuona mali', l.viewing_fee]);
    if (l.title_deed != null && E.LAND.concat(['nyumba', 'mradi']).includes(l.category)) kv.push(['Hati miliki', l.title_deed ? 'Ipo' : 'Haipo']);
    if (l.surveyed != null && E.LAND.includes(l.category)) kv.push(['Kimepimwa', l.surveyed ? 'Ndiyo' : 'Hapana']);
    if (l.project_status) kv.push(['Hatua ya mradi', E.PROJECT_STATUS[l.project_status] || l.project_status]);

    const waText = encodeURIComponent(`Habari, nimeona tangazo lako kwenye 88EST: "${l.title}" (${location.origin}/l/${l.id}). Bado linapatikana?`);
    const waUrl = `https://wa.me/${esc(s.whatsapp)}?text=${waText}`;
    const fav = favs.has(l.id);
    const sname = s.business_name || s.name || '?';
    const avatar = s.avatar_id ? `<img src="${E.img(s.avatar_id)}" alt="">` : esc(sname[0].toUpperCase());
    const rate = s.rating && s.rating.count ? `<i class="ti ti-star-filled"></i> <b>${s.rating.avg}</b> · maoni ${s.rating.count}` : `<i class="ti ${cat.icon}"></i> ${esc(cat.label)} · ${esc(E.DEALS[l.deal])}`;
    setBg(E.img(photos[0]));

    sheetInner.innerHTML = `
      <div class="gallery">
        <div class="track" id="track">${photos.map((p) => `<img src="${E.img(p)}" alt="">`).join('')}</div>
        <div class="g-top">
          <button class="gl-btn" data-close-sheet aria-label="Rudi"><i class="ti ti-arrow-left"></i></button>
          <div class="r"><button class="gl-btn" id="share" aria-label="Share"><i class="ti ti-share"></i></button>
          ${favBtn(l.id)}</div>
        </div>
        ${photos.length > 1 ? `<span class="g-count" id="gcount">1 / ${photos.length}</span>` : ''}
      </div>
      <div class="d-body"><div class="d-wrap"><div class="d-main">
        <div class="grab"></div>
        ${l.status !== 'approved' ? `<div class="card" style="background:#FFF4D6;margin-bottom:12px">Hali ya tangazo: <b>${esc((E.STATUS[l.status] || [l.status])[0])}</b> (umma hauoni tangazo hili)</div>` : ''}
        <h1>${esc(l.title)}</h1>
        <div class="d-rate">${rate}${l.featured ? ' · <span class="hl">Maalum</span>' : ''}${s.verify_level ? ' · <span class="hl">Verified</span>' : ''}</div>
        <div class="d-sub"><i class="ti ti-map-pin"></i>${esc(E.place(l))}</div>
        <div class="facts">${factBox.slice(0, 3).map(([i, t]) => `<div class="fact"><i class="ti ${i}"></i>${esc(t)}</div>`).join('')}</div>

        <div class="host">
          <div class="avatar" data-store="${esc(s.slug)}" style="cursor:pointer">${avatar}</div>
          <div class="grow" style="min-width:0;cursor:pointer" data-store="${esc(s.slug)}">
            <div class="nm">${esc(sname)}${E.verifyIcon(s)}</div>
            <div class="muted small">${esc(E.ACCT[s.account_type] || '')} · ${esc(s.district || s.region || '')}${s.pro ? ' · PRO' : ''}</div>
          </div>
          <a class="msg" href="${waUrl}" target="_blank" rel="noopener" data-lead="wa">Ujumbe</a>
        </div>

        <div class="safe-line"><i class="ti ti-shield-check"></i> Usilipe kabla ya kukutana na muuzaji na kuiona mali.</div>
        ${l.siteplan ? `<div class="d-sec" id="planSec"><h3>Chagua kiwanja kwenye mchoro</h3>
          <div class="plan-sum"><i class="ti ti-map-2"></i><div><b>${l.siteplan.available} kati ya ${l.siteplan.total}</b> vinapatikana${l.siteplan.min_price ? ` · kuanzia <b class="notranslate" translate="no">${E.money(l.siteplan.min_price)}</b>` : ''}</div></div>
          <div id="planBox"><div class="skel" style="height:260px"></div></div><div id="planAsk"></div></div>` : ''}
        ${l.amenities.length ? `<div class="d-sec"><h3>Huduma zilizopo</h3><div class="amen">${l.amenities.map((a) => E.AMEN[a] ? `<div><i class="ti ${E.AMEN[a][1]}"></i>${esc(E.AMEN[a][0])}</div>` : '').join('')}</div></div>` : ''}
        ${l.description ? `<div class="d-sec"><h3>Maelezo</h3><div class="desc">${esc(l.description)}</div></div>` : ''}
        <div class="d-sec"><h3>Taarifa muhimu</h3><div class="kvbox">${kv.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div></div>
        ${l.payment_plan ? `<div class="d-sec"><h3>Mpango wa malipo</h3><div class="desc">${esc(l.payment_plan)}</div></div>` : ''}
        ${l.lat ? `<div class="d-sec"><h3>Mahali</h3><div class="map" id="lmap" style="border-radius:20px"></div><p class="muted tiny mt-s">Eneo la kukadiria.</p></div>` : ''}
        <div class="d-sec">
          <div class="safe-warn"><i class="ti ti-alert-triangle"></i><div><b>Usilipe chochote kabla ya kukutana na muuzaji na kuiona mali.</b><div class="small">Hakikisha mmiliki na nyaraka zake. Ukilipa kabla ya hapo ni kwa hatari yako mwenyewe. <a href="/terms.html" target="_blank">Masharti</a></div></div></div>
          <div class="row between mt"><span class="muted tiny">#${l.id} · ${E.timeAgo(l.created_at)} · ${l.views} wameona</span>
          <button class="report-link" id="report"><i class="ti ti-flag"></i> Ripoti</button></div>
        </div>
      </div>
      <aside class="d-side"><div class="cta glass">
        <div class="pr"><b class="notranslate" translate="no">${l.price ? E.money(l.price) : 'Maelewano'}</b><small>${l.price && E.PERIODS[l.price_period] ? 'kwa ' + E.PERIODS[l.price_period] : esc(E.DEALS[l.deal])}${l.advance_months ? ' · miezi ' + l.advance_months + ' mbele' : ''}${l.negotiable ? ' · inajadilika' : ''}</small></div>
        <a class="call-btn" href="tel:+${esc(s.phone)}" data-lead="call" aria-label="Piga simu"><i class="ti ti-phone"></i></a>
        <a class="wa-btn" href="${waUrl}" target="_blank" rel="noopener" data-lead="wa"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
        <div class="cta-more">
          <div class="host" data-store="${esc(s.slug)}" style="cursor:pointer;background:rgba(255,255,255,.6)"><div class="avatar">${avatar}</div>
            <div style="min-width:0"><div class="nm">${esc(sname)}${E.verifyIcon(s)}</div><div class="muted small">${esc(E.ACCT[s.account_type] || '')}</div></div></div>
          
        </div>
      </div></aside></div>
      <div id="similar"></div>
      </div>`;

    const track = $('#track');
    if (photos.length > 1) {
      track.addEventListener('scroll', () => {
        const i = Math.round(track.scrollLeft / track.clientWidth) + 1;
        $('#gcount').textContent = i + ' / ' + photos.length;
      }, { passive: true });
    }
    sheetInner.onclick = (e) => {
      const a = e.target.closest('[data-lead]');
      if (!a) return;
      const track = () => fetch('/api/listings/' + l.id + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: a.dataset.lead }), keepalive: true }).catch(() => {});
      if (safetyOk()) return track();
      e.preventDefault();
      safetyModal(a, track);
    };
    // Mchoro wa viwanja
    if (l.siteplan && window.SitePlan) {
      E.api('/api/listings/' + l.id + '/plots', { token: localStorage.getItem('est_admin') || E.token() }).then((d) => {
        const box = $('#planBox');
        if (!box || !d.siteplan) return;
        window.SitePlan.viewer(box, d, {
          unit: l.size_unit || 'sqm',
          onChange: (chosen) => {
            const ask = $('#planAsk');
            if (!ask) return;
            if (!chosen.length) { ask.innerHTML = ''; return; }
            const nums = chosen.map((p) => p.number).join(', ');
            const msg = encodeURIComponent(`Habari, nimeona "${l.title}" kwenye 88EST (${location.origin}/l/${l.id}). Naulizia kiwanja/viwanja namba: ${nums}. Bado vinapatikana?`);
            ask.innerHTML = `<a class="wa-btn mt" style="width:100%;justify-content:center" href="https://wa.me/${esc(s.whatsapp)}?text=${msg}" target="_blank" rel="noopener" data-lead="wa"><i class="ti ti-brand-whatsapp"></i> Ulizia ${chosen.length === 1 ? 'kiwanja ' + esc(nums) : 'viwanja ' + chosen.length}</a>`;
          },
        });
      }).catch(() => { const box = $('#planBox'); if (box) box.innerHTML = '<p class="small muted">Mchoro haukufunguka.</p>'; });
    }
    $('#share').onclick = () => share(l.title, location.origin + '/l/' + l.id);
    $('#report').onclick = () => reportModal(l.id);

    if (l.lat) {
      E.loadLeaflet().then((L) => {
        if (!L || !$('#lmap')) return;
        const map = L.map('lmap', { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView([l.lat, l.lng], 14);
        E.tiles(L, map);
        L.circle([l.lat, l.lng], { radius: 600, color: '#C9A24A', fillColor: '#C9A24A', fillOpacity: 0.25 }).addTo(map);
      });
    }
    E.api('/api/listings?' + qs({ category: l.category, region: l.region, limit: 10 })).then((r) => {
      const items = r.items.filter((x) => x.id !== l.id);
      if (items.length && $('#similar')) {
        $('#similar').innerHTML = `<div class="d-sec sim"><h3>Mali zinazofanana</h3><div class="hscroll">${items.map(miniCard).join('')}</div></div>`;
      }
    }).catch(() => {});
  }

  // Onyo la usalama kabla ya kuwasiliana na muuzaji (mara moja kwa kila ziara)
  const safetyOk = () => sessionStorage.getItem('est_safe_ok') === '1';
  function safetyModal(link, after) {
    const m = E.modal(`<div class="center"><div class="safe-ic"><i class="ti ti-shield-exclamation"></i></div>
      <h2>Kabla hujawasiliana</h2></div>
      <ul class="safe-list">
        <li><b>Usilipe chochote</b> (amana, booking, ada ya kuona) kabla ya kukutana na muuzaji na kuiona mali kwa macho yako.</li>
        <li>Hakikisha mmiliki halisi na nyaraka (hati, mkataba) kwenye mamlaka husika kabla ya kulipa. 88EST haithibitishi umiliki wa kila mali.</li>
        <li>Kutana mahali salama, mchana, ukiwa na mtu unayemwamini.</li>
      </ul>
      <p class="small muted">88EST inaunganisha wateja na wauzaji tu, na si mhusika kwenye malipo. Ukilipa kabla ya kukutana na muuzaji ni kwa hatari yako mwenyewe. <a href="/terms.html" target="_blank" style="text-decoration:underline">Terms and Conditions</a></p>
      <button class="btn btn-gold btn-block" id="safeOk">Nimeelewa, endelea</button>`);
    m.querySelector('#safeOk').onclick = () => {
      sessionStorage.setItem('est_safe_ok', '1');
      E.closeModal();
      if (after) after();
      if (link.target === '_blank') window.open(link.href, '_blank', 'noopener');
      else location.href = link.href;
    };
  }
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-guard]');
    if (g && !safetyOk()) { e.preventDefault(); safetyModal(g); }
  }, true);

  function closeSheet() {
    sheet.classList.remove('open');
    document.body.classList.remove('sheet-open');
    document.body.style.overflow = '';
  }

  function reportModal(id) {
    const m = E.modal(`<h2>Ripoti tangazo</h2>
      <form id="rf">
        ${Object.entries(E.REPORTS).map(([k, t], i) => `<label class="check" style="margin-bottom:6px"><input type="radio" name="reason" value="${k}" ${i === 0 ? 'checked' : ''}> ${t}</label>`).join('')}
        <div class="field mt"><textarea class="input" name="details" placeholder="Maelezo zaidi (si lazima)" style="min-height:80px"></textarea></div>
        <div class="field"><input class="input" name="phone" inputmode="tel" placeholder="Namba yako ya simu (si lazima)"></div>
        <div id="capRp"></div>
        <button class="btn btn-dark btn-block">Tuma ripoti</button>
      </form>`);
    let cap = null;
    E.captcha(m.querySelector('#capRp')).then((c) => { cap = c; });
    m.querySelector('#rf').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button.btn');
      E.busy(btn, true);
      try {
        const r = await E.api('/api/listings/' + id + '/report', { body: { ...E.formData(e.target), captcha: E.capToken(cap) }, token: '' });
        E.closeModal();
        E.toast(r.message || 'Asante kwa ripoti', 'ok');
      } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); if (cap) cap.reset(); }
    };
  }

  async function share(title, url) {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (e) { /* ameghairi */ }
    } else {
      try { await navigator.clipboard.writeText(url); E.toast('Link imenakiliwa', 'ok'); } catch (e) { prompt('Nakili link hii:', url); }
    }
  }

  // ===== Ukurasa wa muuzaji =====
  async function storePage(slug) {
    view.innerHTML = `<div class="store-head"><div class="skel" style="height:140px;opacity:.15"></div></div>${skelGrid()}`;
    let d;
    try {
      d = await E.api('/api/sellers/' + encodeURIComponent(slug));
    } catch (e) {
      view.innerHTML = `<div class="page-h"><a href="#/madalali" class="gl-btn" style="background:#fff;color:var(--charcoal)"><i class="ti ti-arrow-left"></i></a></div><div class="empty"><i class="ti ti-user-x"></i>${esc(e.message)}</div>`;
      return;
    }
    const s = d.seller;
    const name = s.business_name || s.name;
    document.title = name + ' | 88EST';
    if (d.listings[0]) setBg(E.img(d.listings[0].photo));
    const avatar = s.avatar_id ? `<img src="${E.img(s.avatar_id)}" alt="">` : esc(name[0].toUpperCase());
    view.innerHTML = `
      <div class="store-head">
        <div class="row between"><a href="#/madalali" class="gl-btn" aria-label="Rudi"><i class="ti ti-arrow-left"></i></a>
          <button class="gl-btn" id="shareStore" aria-label="Share"><i class="ti ti-share"></i></button></div>
        <div class="row gap mt"><div class="avatar">${avatar}</div>
          <div style="min-width:0"><h1>${esc(name)}${s.verify_level ? ' <i class="ti ti-rosette-discount-check gold"></i>' : ''}</h1>
          <div class="muted small">${esc(E.ACCT[s.account_type])}${s.business_name && s.name ? ' · ' + esc(s.name) : ''}</div>
          <div class="small">${s.rating.count ? E.stars(s.rating.avg) + ' ' + s.rating.avg + ' (' + s.rating.count + ')' : '<span class="muted">Bado hana maoni</span>'}</div></div></div>
        <div class="mt-s">${E.badges(s)}</div>
        <div class="small mt-s"><i class="ti ti-map-pin gold"></i> Anapatikana: ${esc(E.place(s))}</div>
        ${s.service_areas ? `<div class="small"><i class="ti ti-route gold"></i> Anafanya kazi: ${esc(s.service_areas)}</div>` : ''}
        ${s.bio ? `<p class="small" style="opacity:.85;white-space:pre-line;margin-bottom:0">${esc(s.bio)}</p>` : ''}
        <div class="store-actions">
          <a class="btn btn-ghost" href="tel:+${esc(s.phone)}" data-guard><i class="ti ti-phone"></i> Piga</a>
          <a class="btn btn-gold" href="https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent('Habari, nimekuona kwenye 88EST.')}" target="_blank" rel="noopener" data-guard><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
        </div>
      </div>
      <div class="sec-h"><h2>Matangazo (${d.listings.length})</h2></div>
      ${d.listings.length ? `<div class="grid">${d.listings.map(listCard).join('')}</div>` : '<div class="empty small">Hakuna matangazo kwa sasa.</div>'}
      <div class="sec-h"><h2>Maoni ya wateja</h2><button class="see-all glass" id="rateBtn"><i class="ti ti-star"></i> Toa maoni</button></div>
      <div class="card glass" style="margin:0 18px">${d.ratings.length ? d.ratings.map((r) => `<div class="rating-item"><div class="row between"><b class="small">${esc(r.name)}</b>${E.stars(r.stars)}</div>${r.comment ? `<div class="small" style="margin-top:4px">${esc(r.comment)}</div>` : ''}<div class="muted tiny">${E.date(r.created_at)}</div></div>`).join('') : '<p class="muted small" style="margin:0">Bado hakuna maoni.</p>'}</div>`;
    $('#shareStore').onclick = () => share(name, location.origin + '/a/' + s.slug);
    $('#rateBtn').onclick = () => rateModal(s.slug);
  }

  function rateModal(slug) {
    const m = E.modal(`<h2>Toa maoni</h2>
      <form id="rtf">
        <div class="field"><label>Nyota</label><div class="seg">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="stars" value="${n}" ${n === 5 ? 'checked' : ''}><span>${n} <i class="ti ti-star"></i></span></label>`).join('')}</div></div>
        <div class="field"><input class="input" name="name" placeholder="Jina lako" required></div>
        <div class="field"><input class="input" name="phone" inputmode="tel" placeholder="Namba yako ya simu (haitaonekana)" required></div>
        <div class="field"><textarea class="input" name="comment"  placeholder="Maoni (si lazima)" style="min-height:80px"></textarea></div>
        <div id="capRt"></div>
        <button class="btn btn-gold btn-block">Tuma maoni</button>
      </form>`);
    let cap = null;
    E.captcha(m.querySelector('#capRt')).then((c) => { cap = c; });
    m.querySelector('#rtf').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button.btn');
      E.busy(btn, true);
      try {
        await E.api('/api/sellers/' + encodeURIComponent(slug) + '/rate', { body: { ...E.formData(e.target), captcha: E.capToken(cap) }, token: '' });
        E.closeModal();
        E.toast('Asante kwa maoni yako', 'ok');
        storePage(slug);
      } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); if (cap) cap.reset(); }
    };
  }

  // ===== Madalali =====
  async function sellersPage(params) {
    document.title = 'Madalali na developers | 88EST';
    const type = params.type || '';
    view.innerHTML = `
      ${header()}
      <div class="page-h" style="padding-top:4px"><h1>Madalali na developers</h1></div>
      <div class="deal-tabs" id="types">${[['', 'Wote'], ['agent', 'Madalali'], ['developer', 'Developers'], ['owner', 'Wenye mali']].map(([k, t]) => `<button class="glass ${type === k ? 'on' : ''}" data-type="${k}">${t}</button>`).join('')}</div>
      <div class="grid2" style="padding:12px 18px 10px">
        <select class="input glass" id="sReg">${E.regionOptions(params.region, 'Mikoa yote')}</select>
        <input class="input glass" id="sQ" placeholder="Tafuta jina au eneo" value="${esc(params.q || '')}">
      </div>
      <div id="sellers"><div class="empty"><span class="spin"></span></div></div>`;
    const go = (patch) => { location.hash = '#/madalali?' + qs({ ...params, ...patch }); };
    $('#types').onclick = (e) => { const b = e.target.closest('[data-type]'); if (b) go({ type: b.dataset.type }); };
    $('#sReg').onchange = (e) => go({ region: e.target.value });
    $('#sQ').onkeydown = (e) => { if (e.key === 'Enter') go({ q: e.target.value }); };
    try {
      const r = await E.api('/api/sellers?' + qs(params));
      $('#sellers').innerHTML = r.items.length
        ? r.items.map((s) => {
          const nm = s.business_name || s.name;
          const av = s.avatar_id ? `<img src="${E.img(s.avatar_id)}" alt="">` : esc(nm[0].toUpperCase());
          return `<div class="seller-row glass" data-store="${esc(s.slug)}"><div class="avatar">${av}</div>
            <div class="grow" style="min-width:0"><div class="nm">${esc(nm)}${E.verifyIcon(s)}</div>
            <div class="muted small">${esc(E.ACCT[s.account_type])} · ${esc([s.ward, s.district, s.region].filter(Boolean).join(', '))}</div>
            <div class="tiny muted">${s.listing_count} matangazo${s.rating ? ' · ' + s.rating + ' <i class="ti ti-star-filled gold"></i>' : ''} ${s.pro ? '<span class="badge badge-dark">PRO</span>' : ''}</div></div>
            <span class="go sm"><i class="ti ti-arrow-right"></i></span></div>`;
        }).join('')
        : '<div class="empty"><i class="ti ti-users"></i>Hakuna aliyepatikana.</div>';
    } catch (e) {
      $('#sellers').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }

  // ===== Vipendwa =====
  async function favsPage() {
    document.title = 'Vipendwa | 88EST';
    const ids = favs.get();
    view.innerHTML = `${header()}<div class="page-h" style="padding-top:4px"><h1>Vipendwa vyako</h1></div><div id="fv">${ids.length ? skelGrid() : ''}</div>`;
    if (!ids.length) {
      $('#fv').innerHTML = '<div class="empty"><i class="ti ti-heart"></i>Bonyeza moyo kwenye tangazo kulihifadhi hapa.</div>';
      return;
    }
    try {
      const r = await E.api('/api/listings?ids=' + ids.join(',') + '&limit=60');
      const order = new Map(ids.map((id, i) => [id, i]));
      r.items.sort((a, b) => order.get(a.id) - order.get(b.id));
      if (r.items[0]) setBg(E.img(r.items[0].photo));
      $('#fv').innerHTML = r.items.length ? `<div class="grid">${r.items.map(listCard).join('')}</div>` : '<div class="empty">Ulizohifadhi hazipo hewani tena.</div>';
    } catch (e) {
      $('#fv').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }

  // ===== Akaunti =====
  function accountPage() {
    document.title = 'Akaunti | 88EST';
    const c = S.cfg || {};
    const loggedIn = !!localStorage.getItem('est_token');
    view.innerHTML = `
      ${header()}
      <div style="padding:8px 18px">
        <div class="card" style="background:var(--charcoal);color:var(--off)">
          <h2 style="color:#fff">Una mali ya kupangisha au kuuza?</h2>
          <p class="small" style="opacity:.85">Jisajili bure na weka tangazo. Wateja wanakupigia moja kwa moja.</p>
          <a class="btn btn-gold btn-block mt" style="border-radius:26px" href="/portal.html">${loggedIn ? 'Fungua dashibodi yangu' : 'Jisajili au ingia'}</a>
        </div>
        <div class="card glass">
          <h3>Lugha / Language</h3>
          ${E.langButton()}
        </div>
        <div class="card glass">
          <h3>Kuhusu 88EST</h3>
          <p class="small muted">Soko la mali Tanzania. 88EST inaunganisha wateja na wauzaji; makubaliano ni kati yao.</p>
          <a class="row gap mt" href="https://wa.me/${esc(c.support_phone || '')}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp gold"></i> +${esc(c.support_phone || '')}</a>
          <a class="row gap mt-s" href="mailto:${esc(c.support_email || '')}"><i class="ti ti-mail gold"></i> ${esc(c.support_email || '')}</a>
        </div>
        ${installBar()}
      </div>
      <div class="footer-note">88EST · HUGO TECH · <a href="/terms.html" style="text-decoration:underline">Terms</a> · <a href="/privacy.html" style="text-decoration:underline">Privacy</a></div>`;
    bindInstall();
  }

  // ===== Kuweka app kwenye simu (PWA) =====
  function installBar() {
    if (!S.installEvt) return '<div id="installBox"></div>';
    return `<div id="installBox"><div class="install-bar">${E.logoIcon(40)}<div class="grow"><b>Weka 88EST kwenye simu</b></div><button class="btn btn-gold btn-sm" id="installBtn">Weka</button></div></div>`;
  }
  function bindInstall() {
    const b = $('#installBtn');
    if (b) b.onclick = async () => { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; $('#installBox').innerHTML = ''; };
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    S.installEvt = e;
    const box = $('#installBox');
    if (box) { box.outerHTML = installBar(); bindInstall(); }
  });

  // ===== Bonyezo za jumla =====
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      e.stopPropagation();
      const on = favs.toggle(fav.dataset.fav);
      document.querySelectorAll(`[data-fav="${fav.dataset.fav}"]`).forEach((b) => {
        b.classList.toggle('on', on);
        b.innerHTML = `<i class="ti ti-heart${on ? '-filled' : ''}"></i>`;
      });
      E.toast(on ? 'Imehifadhiwa kwenye vipendwa' : 'Imeondolewa kwenye vipendwa');
      return;
    }
    const card = e.target.closest('[data-l]');
    if (card) { S.fromApp = true; location.hash = '#/l/' + card.dataset.l; return; }
    const st = e.target.closest('[data-store]');
    if (st) { closeSheet(); location.hash = '#/a/' + st.dataset.store; return; }
    if (e.target.closest('[data-close-sheet]')) {
      if (S.fromApp) { S.fromApp = false; history.back(); } else location.hash = '#/';
    }
  });

  // ===== Router =====
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, query] = h.split('?');
    return { path, params: Object.fromEntries(new URLSearchParams(query || '')) };
  }
  function setNav(name) {
    const { path, params } = parseHash();
    let dn = name;
    if (path === '/s' && (params.deal === 'rent' || params.deal === 'sale') && Object.keys(params).length === 1) dn = params.deal;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (a.closest('.dlinks') ? dn : name)));
  }
  async function route() {
    const { path, params } = parseHash();
    closePanel();
    const m = path.match(/^\/l\/(\d+)/);
    if (m) {
      if (!view.innerHTML) { setNav('home'); S.lastView = '#/'; await home(); }
      openListing(m[1]);
      return;
    }
    closeSheet();
    S.fromApp = false;
    const key = location.hash || '#/';
    if (key === S.lastView && view.innerHTML) return;
    S.lastView = key;
    window.scrollTo(0, 0);
    const a = path.match(/^\/a\/([^/]+)/);
    if (a) { setNav('madalali'); return storePage(decodeURIComponent(a[1])); }
    if (path === '/s') { setNav('home'); return searchPage(params); }
    if (path === '/madalali') { setNav('madalali'); return sellersPage(params); }
    if (path === '/vipendwa') { setNav('vipendwa'); return favsPage(); }
    if (path === '/akaunti') { setNav('akaunti'); return accountPage(); }
    setNav('home');
    return home();
  }
  window.addEventListener('hashchange', route);

  // Kichwa cha skrini pana
  $('#dLogo').innerHTML = E.logo();
  $('#dLang').innerHTML = E.langButton('glass');

  E.api('/api/config').then((c) => { S.cfg = c; }).catch(() => {});
  route();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
