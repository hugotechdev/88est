// 88EST - Paneli ya admin (HUGO TECH)
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = E.esc;
  const root = $('#root');
  E.tokenKey = 'est_admin';
  const S = { stats: {} };

  const TABS = [
    ['/', 'ti-layout-dashboard', 'Muhtasari'],
    ['/listings', 'ti-home-check', 'Matangazo', 'pending'],
    ['/users', 'ti-users', 'Wauzaji'],
    ['/verify', 'ti-rosette-discount-check', 'Uthibitisho', 'verifications'],
    ['/pro', 'ti-crown', 'Malipo ya Pro', 'pro_requests'],
    ['/reports', 'ti-flag', 'Ripoti', 'reports'],
    ['/ratings', 'ti-star', 'Maoni'],
    ['/map', 'ti-map', 'Ramani'],
    ['/settings', 'ti-settings', 'Mipangilio'],
  ];

  function login() {
    document.title = 'Admin | 88EST';
    root.innerHTML = `<div class="auth-wrap">${E.logo(true)}<p style="color:var(--grey2)">Paneli ya admin</p>
      <div class="auth-card"><form id="lf">
        <div class="field"><label>Namba ya simu</label><input class="input" name="phone" inputmode="tel" required></div>
        <div class="field"><label>Password</label><input class="input" type="password" name="password" required></div>
        <button class="btn btn-dark btn-block">Ingia</button></form></div></div>`;
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      E.busy(btn, true);
      try {
        const r = await E.api('/api/auth/login', { body: E.formData(e.target), token: '' });
        if (r.user.role !== 'admin') throw new Error('Akaunti hii si ya admin');
        localStorage.setItem('est_admin', r.token);
        route();
      } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
    };
  }

  async function shell(active) {
    try { S.stats = await E.api('/api/admin/stats'); } catch (e) {
      if (e.status === 401 || e.status === 403) { localStorage.removeItem('est_admin'); login(); return null; }
    }
    root.innerHTML = `
      <div class="p-top"><a href="/" target="_blank">${E.logo(true)}</a><div class="row gap">${E.langButton('dark')}<div class="who"><b>Admin</b><a href="#" id="out" style="color:var(--gold)">Toka</a></div></div></div>
      <nav class="p-tabs">${TABS.map(([h, i, t, k]) => `<a href="#${h}" class="${active === h ? 'on' : ''}"><i class="ti ${i}"></i>${t}${k && S.stats[k] ? ` <span class="cnt">${S.stats[k]}</span>` : ''}</a>`).join('')}</nav>
      <main class="p-main" id="main"></main>`;
    $('#out').onclick = (e) => { e.preventDefault(); localStorage.removeItem('est_admin'); login(); };
    document.title = (TABS.find((t) => t[0] === active) || [0, 0, 'Admin'])[2] + ' | Admin 88EST';
    return $('#main');
  }

  const act = async (url, body, okMsg) => {
    try {
      const r = await E.api(url, { body });
      if (okMsg) E.toast(okMsg, 'ok');
      return r;
    } catch (err) { E.toast(err.message, 'err'); return null; }
  };
  const ask = (title, label, ph = '') => new Promise((resolve) => {
    const m = E.modal(`<h3>${esc(title)}</h3><textarea class="input" id="askV" placeholder="${esc(ph)}" style="min-height:80px"></textarea><button class="btn btn-gold btn-block mt" id="askOk">${esc(label)}</button>`);
    m.querySelector('#askOk').onclick = () => { const v = m.querySelector('#askV').value.trim(); E.closeModal(); resolve(v || null); };
  });
  const zoom = (src) => E.modal(`<img class="zoom-img" src="${src}">`, { wide: true });

  // ===== Muhtasari =====
  async function overview() {
    const main = await shell('/');
    if (!main) return;
    const s = S.stats;
    const box = (i, n, t, h) => `<a class="stat" ${h ? `href="#${h}"` : ''}><i class="ti ${i}"></i><b>${n}</b><span>${t}</span></a>`;
    main.innerHTML = `
      <h1>Muhtasari wa 88EST</h1>
      ${s.pending || s.verifications || s.pro_requests || s.reports ? `<div class="alert alert-gold"><i class="ti ti-bell-ringing"></i><div><b>Kazi zinazosubiri</b><div class="small">
        ${s.pending ? `<a href="#/listings" style="text-decoration:underline">Matangazo ${s.pending}</a> · ` : ''}
        ${s.verifications ? `<a href="#/verify" style="text-decoration:underline">Uthibitisho ${s.verifications}</a> · ` : ''}
        ${s.pro_requests ? `<a href="#/pro" style="text-decoration:underline">Malipo ya Pro ${s.pro_requests}</a> · ` : ''}
        ${s.reports ? `<a href="#/reports" style="text-decoration:underline">Ripoti ${s.reports}</a>` : ''}</div></div></div>` : '<div class="alert alert-dark"><i class="ti ti-circle-check gold"></i><div>Hakuna kazi inayosubiri. Safi!</div></div>'}
      <h3 class="mt">Wauzaji</h3>
      <div class="stats">${box('ti-users', s.sellers, 'Wote', '/users')}${box('ti-user-star', s.agents, 'Madalali')}${box('ti-crane', s.developers, 'Developers')}${box('ti-home-heart', s.owners, 'Wenye mali')}${box('ti-crown', s.pro, 'Pro')}${box('ti-user-plus', s.new_week, 'Wapya wiki hii')}</div>
      <h3 class="mt">Matangazo</h3>
      <div class="stats">${box('ti-clock', s.pending, 'Yanasubiri', '/listings')}${box('ti-circle-check', s.approved, 'Hewani')}${box('ti-eye-off', s.hidden, 'Yamefichwa')}${box('ti-check', s.taken, 'Yamechukuliwa')}${box('ti-eye', s.views, 'Walioona')}${box('ti-phone-call', s.leads, 'Leads (simu+WA)')}</div>
      <div class="card mt"><h3>Mweke muuzaji kwa niaba yake</h3><p class="small muted">Kwa madalali wasiojua teknolojia: fungua akaunti yao hapa, kisha "Ingia kama" kuwawekea matangazo.</p>
        <button class="btn btn-gold" id="newSeller"><i class="ti ti-user-plus"></i> Sajili muuzaji</button></div>`;
    $('#newSeller').onclick = newSellerModal;
  }

  function newSellerModal() {
    const m = E.modal(`<h2>Sajili muuzaji</h2><form id="nf">
      <div class="field"><div class="type-pick">${Object.entries(E.ACCT).map(([k, t], i) => `<label><input type="radio" name="account_type" value="${k}" ${i === 0 ? 'checked' : ''}><i class="ti ti-user"></i>${t}</label>`).join('')}</div></div>
      <div class="field"><input class="input" name="name" placeholder="Jina kamili *" required></div>
      <div class="field"><input class="input" name="business_name" placeholder="Jina la biashara"></div>
      <div class="grid2"><input class="input" name="phone" placeholder="Simu *" inputmode="tel" required><input class="input" name="whatsapp" placeholder="WhatsApp" inputmode="tel"></div>
      <div class="field mt-s"><input class="input" name="email" placeholder="Email"></div>
      <div class="grid2"><select class="input" name="region" id="nReg">${E.regionOptions('Dar es Salaam')}</select><select class="input" name="district" id="nDis">${E.districtOptions('Dar es Salaam')}</select></div>
      <div class="field mt-s"><input class="input" name="ward" placeholder="Kata / Mtaa"></div>
      <div class="field"><input class="input" name="password" placeholder="Password (acha wazi tutengeneze)"></div>
      <button class="btn btn-gold btn-block">Sajili</button></form>`);
    E.bindRegion(m, '#nReg', '#nDis');
    m.querySelector('#nf').onsubmit = async (e) => {
      e.preventDefault();
      const r = await act('/api/admin/users', E.formData(e.target));
      if (!r) return;
      E.modal(`<h2>Muuzaji amesajiliwa</h2><p>Mpe taarifa hizi za kuingia:</p>
        <div class="card" style="background:var(--off)"><div>Simu: <b>${esc(E.phoneLocal(r.user.phone))}</b></div><div>Password: <b>${esc(r.password)}</b></div><div class="small mt-s">Link: ${esc(location.origin)}/portal.html</div></div>
        <button class="btn btn-gold btn-block mt" id="imp">Ingia kama yeye kumwekea tangazo</button>`).querySelector('#imp').onclick = () => impersonate(r.user.id, '#/new');
    };
  }

  async function impersonate(id, target = '#/') {
    const r = await act('/api/admin/users/' + id + '/impersonate', {});
    if (r) window.open('/portal.html?imp=' + encodeURIComponent(r.token) + target, '_blank');
  }

  // ===== Matangazo =====
  async function listings(params) {
    const main = await shell('/listings');
    if (!main) return;
    const status = params.status !== undefined ? params.status : 'pending';
    main.innerHTML = `<h1>Matangazo</h1>
      <div class="pill-tabs" id="st">${[['pending', 'Yanasubiri'], ['approved', 'Hewani'], ['rejected', 'Yamekataliwa'], ['hidden', 'Yamefichwa'], ['taken', 'Yamechukuliwa'], ['', 'Yote']].map(([k, t]) => `<button class="${status === k ? 'on' : ''}" data-s="${k}">${t}</button>`).join('')}</div>
      <div class="filters"><input class="input" id="q" placeholder="Tafuta kichwa, muuzaji, simu, mtaa" value="${esc(params.q || '')}"></div>
      <div id="lst"><div class="empty"><span class="spin"></span></div></div>`;
    const go = (p) => { location.hash = '#/listings?' + new URLSearchParams({ status, q: params.q || '', ...p }).toString(); };
    $('#st').onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) go({ status: b.dataset.s }); };
    $('#q').onkeydown = (e) => { if (e.key === 'Enter') go({ q: e.target.value }); };
    const r = await E.api('/api/admin/listings?' + new URLSearchParams({ status, q: params.q || '', user: params.user || '' }));
    if (!r.items.length) { $('#lst').innerHTML = '<div class="empty"><i class="ti ti-inbox"></i>Hakuna matangazo hapa.</div>'; return; }
    $('#lst').innerHTML = r.items.map((l) => {
      const st = E.STATUS[l.status] || [l.status, ''];
      return `<div class="a-item">
        <div class="hd"><div style="min-width:0"><b>${esc(l.title)}</b>
          <div class="small muted">#${l.id} · ${esc(E.cat(l.category).label)} · ${esc(E.DEALS[l.deal])} · ${l.price ? E.money(l.price) + E.per(l.price_period) : 'Maelewano'}</div>
          <div class="small"><i class="ti ti-map-pin"></i> ${esc(E.place(l))}</div>
          <div class="small"><i class="ti ti-user"></i> ${esc(l.seller_business || l.seller_name)} · ${esc(E.phoneLocal(l.seller_phone))} ${l.seller_verify ? '<i class="ti ti-rosette-discount-check gold"></i>' : ''}</div></div>
          <div style="text-align:right"><span class="badge ${st[1]}">${st[0]}</span>${l.featured_active ? '<div><span class="badge badge-gold">Maalum</span></div>' : ''}${l.open_reports ? `<div><span class="badge st-rejected">Ripoti ${l.open_reports}</span></div>` : ''}</div></div>
        <div class="a-imgs">${(l.photos || []).map((p) => `<img src="${E.img(p)}" data-zoom="${E.img(p)}">`).join('')}</div>
        ${l.description ? `<div class="small mt-s" style="max-height:66px;overflow:hidden;white-space:pre-line">${esc(l.description)}</div>` : ''}
        ${l.reject_reason ? `<div class="small" style="color:var(--red)">Sababu: ${esc(l.reject_reason)}</div>` : ''}
        <div class="tiny muted mt-s">${E.timeAgo(l.created_at)} · Walioona ${l.views} · Simu ${l.leads_call} · WA ${l.leads_wa}</div>
        <div class="acts">
          ${l.status !== 'approved' ? `<button class="btn btn-gold btn-sm" data-a="approve" data-id="${l.id}"><i class="ti ti-check"></i> ${l.status === 'hidden' ? 'Rudisha' : 'Kubali'}</button>` : ''}
          ${l.status === 'pending' ? `<button class="btn btn-danger btn-sm" data-a="reject" data-id="${l.id}"><i class="ti ti-x"></i> Kataa</button>` : ''}
          ${l.status === 'approved' ? `<button class="btn btn-ghost btn-sm" data-a="feature" data-id="${l.id}"><i class="ti ti-star"></i> ${l.featured_active ? 'Ondoa maalum' : 'Fanya maalum'}</button>` : ''}
          ${l.status === 'approved' ? `<button class="btn btn-ghost btn-sm" data-a="hide" data-id="${l.id}"><i class="ti ti-eye-off"></i> Ficha</button>` : ''}
          <a class="btn btn-ghost btn-sm" href="/#/l/${l.id}" target="_blank"><i class="ti ti-external-link"></i> Fungua</a>
          <button class="btn btn-ghost btn-sm" data-a="imp" data-id="${l.user_id}" data-lid="${l.id}"><i class="ti ti-edit"></i> Hariri (kama muuzaji)</button>
          <button class="btn btn-danger btn-sm" data-a="delete" data-id="${l.id}"><i class="ti ti-trash"></i></button>
        </div></div>`;
    }).join('');
    $('#lst').onclick = async (e) => {
      const z = e.target.closest('[data-zoom]');
      if (z) return zoom(z.dataset.zoom);
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      const id = b.dataset.id;
      const url = '/api/admin/listings/' + id + '/action';
      let ok = null;
      if (a === 'imp') return impersonate(id, '#/edit/' + b.dataset.lid);
      if (a === 'approve') ok = await act(url, { action: 'approve' }, 'Limekubaliwa');
      if (a === 'reject') { const reason = await ask('Sababu ya kukataa', 'Kataa', 'Mfano: Picha si wazi, weka picha halisi'); if (reason) ok = await act(url, { action: 'reject', reason }, 'Limekataliwa'); }
      if (a === 'hide') ok = await act(url, { action: 'hide' }, 'Limefichwa');
      if (a === 'delete' && (await E.confirm('Futa tangazo hili kabisa?'))) ok = await act(url, { action: 'delete' }, 'Limefutwa');
      if (a === 'feature') {
        if (b.textContent.includes('Ondoa')) ok = await act(url, { action: 'feature', days: 0 }, 'Limeondolewa');
        else {
          const m = E.modal(`<h3>Fanya tangazo maalum kwa muda gani?</h3><div class="row gap wrap">${[7, 14, 30, 60].map((d) => `<button class="btn btn-ghost" data-d="${d}">Siku ${d}</button>`).join('')}</div>`);
          m.onclick = async (ev) => { const d = ev.target.closest('[data-d]'); if (d) { E.closeModal(); if (await act(url, { action: 'feature', days: d.dataset.d }, 'Sasa ni maalum')) route(true); } };
        }
      }
      if (ok) route(true);
    };
  }

  // ===== Wauzaji =====
  async function users(params) {
    const main = await shell('/users');
    if (!main) return;
    main.innerHTML = `<div class="row between mb"><h1 style="margin:0">Wauzaji</h1><button class="btn btn-gold btn-sm" id="newSeller"><i class="ti ti-user-plus"></i> Sajili</button></div>
      <div class="filters"><input class="input" id="q" placeholder="Jina, simu, email, mtaa" value="${esc(params.q || '')}">
        <select class="input" id="ty"><option value="">Aina zote</option>${Object.entries(E.ACCT).map(([k, t]) => `<option value="${k}" ${params.type === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="input" id="rg">${E.regionOptions(params.region, 'Mikoa yote')}</select></div>
      <div id="lst"><div class="empty"><span class="spin"></span></div></div>`;
    $('#newSeller').onclick = newSellerModal;
    const go = (p) => { location.hash = '#/users?' + new URLSearchParams({ q: params.q || '', type: params.type || '', region: params.region || '', ...p }).toString(); };
    $('#q').onkeydown = (e) => { if (e.key === 'Enter') go({ q: e.target.value }); };
    $('#ty').onchange = (e) => go({ type: e.target.value });
    $('#rg').onchange = (e) => go({ region: e.target.value });
    const r = await E.api('/api/admin/users?' + new URLSearchParams({ q: params.q || '', type: params.type || '', region: params.region || '' }));
    if (!r.items.length) { $('#lst').innerHTML = '<div class="empty">Hakuna aliyepatikana.</div>'; return; }
    $('#lst').innerHTML = r.items.map((u) => `<div class="a-item">
      <div class="hd"><div class="row gap" style="min-width:0"><div class="avatar" style="width:46px;height:46px;font-size:17px">${u.avatar_id ? `<img src="${E.img(u.avatar_id)}">` : esc((u.business_name || u.name)[0])}</div>
        <div style="min-width:0"><b>${esc(u.business_name || u.name)}</b>${u.business_name ? `<span class="muted small"> · ${esc(u.name)}</span>` : ''}
        <div class="small muted">${esc(E.ACCT[u.account_type])} · ${esc(E.place(u))}</div>
        <div class="small">${esc(E.phoneLocal(u.phone))} ${u.phone_verified ? '<i class="ti ti-check gold" title="Simu imethibitishwa"></i>' : `<span class="badge st-pending">Simu haijathibitishwa${u.otp_code ? ' · Code: ' + esc(u.otp_code) : ''}</span>`} · ${esc(u.email || '')}</div></div></div>
        <div style="text-align:right">${E.badges(u)}${u.status === 'suspended' ? '<span class="badge st-rejected">Amesimamishwa</span>' : ''}</div></div>
      <div class="tiny muted mt-s">Alijiunga ${E.date(u.created_at)} · Matangazo ${u.listing_count} (hewani ${u.live_count})${u.pro ? ' · Pro mpaka ' + E.date(u.pro_until) : ''}</div>
      <div class="acts">
        <button class="btn btn-ghost btn-sm" data-a="imp" data-id="${u.id}"><i class="ti ti-login"></i> Ingia kama</button>
        <a class="btn btn-ghost btn-sm" href="#/listings?status=&user=${u.id}"><i class="ti ti-list"></i> Matangazo</a>
        <button class="btn btn-ghost btn-sm" data-a="level" data-id="${u.id}" data-lv="${u.verify_level}"><i class="ti ti-rosette-discount-check"></i> Ngazi (${u.verify_level})</button>
        <button class="btn btn-ghost btn-sm" data-a="pro" data-id="${u.id}"><i class="ti ti-crown"></i> Pro</button>
        ${!u.phone_verified ? `<button class="btn btn-ghost btn-sm" data-a="phone" data-id="${u.id}"><i class="ti ti-device-mobile-check"></i> Thibitisha simu</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-a="reset" data-id="${u.id}"><i class="ti ti-key"></i> Password mpya</button>
        <a class="btn btn-wa btn-sm" href="https://wa.me/${esc(u.whatsapp)}" target="_blank"><i class="ti ti-brand-whatsapp"></i></a>
        ${u.status === 'suspended' ? `<button class="btn btn-gold btn-sm" data-a="activate" data-id="${u.id}">Rudisha</button>` : `<button class="btn btn-danger btn-sm" data-a="suspend" data-id="${u.id}"><i class="ti ti-ban"></i> Simamisha</button>`}
      </div></div>`).join('');
    $('#lst').onclick = async (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const id = b.dataset.id;
      const url = '/api/admin/users/' + id + '/action';
      const a = b.dataset.a;
      if (a === 'imp') return impersonate(id);
      if (a === 'level') {
        const m = E.modal(`<h3>Ngazi ya uthibitisho</h3>${[[0, 'Hajathibitishwa'], [1, 'Verified'], [2, 'Kampuni iliyosajiliwa']].map(([k, t]) => `<button class="btn btn-ghost btn-block mt-s" data-l="${k}">${k}: ${t}</button>`).join('')}`);
        m.onclick = async (ev) => { const x = ev.target.closest('[data-l]'); if (x) { E.closeModal(); if (await act(url, { action: 'verify_level', level: x.dataset.l }, 'Imebadilishwa')) route(true); } };
        return;
      }
      if (a === 'pro') {
        const m = E.modal(`<h3>Washa Pro (miezi)</h3><div class="row gap wrap">${[1, 3, 6, 12].map((k) => `<button class="btn btn-ghost" data-m="${k}">+${k}</button>`).join('')}<button class="btn btn-danger" data-m="0">Ondoa Pro</button></div>`);
        m.onclick = async (ev) => { const x = ev.target.closest('[data-m]'); if (x) { E.closeModal(); if (await act(url, { action: 'pro', months: x.dataset.m }, 'Imebadilishwa')) route(true); } };
        return;
      }
      if (a === 'reset') {
        if (!(await E.confirm('Mtengenezee password mpya?'))) return;
        const r = await act(url, { action: 'reset_password' });
        if (r) E.modal(`<h3>Password mpya</h3><div class="card" style="background:var(--off);font-size:20px;text-align:center"><b>${esc(r.password)}</b></div><p class="small muted">Mtumie muuzaji kwa WhatsApp au SMS.</p>`);
        return;
      }
      const map = { phone: ['phone_verified', 'Simu imethibitishwa'], suspend: ['suspend', 'Amesimamishwa'], activate: ['activate', 'Amerudishwa'] };
      if (a === 'suspend' && !(await E.confirm('Simamisha muuzaji huyu? Matangazo yake hayataonekana.'))) return;
      if (map[a] && (await act(url, { action: map[a][0] }, map[a][1]))) route(true);
    };
  }

  // ===== Uthibitisho =====
  async function verifications() {
    const main = await shell('/verify');
    if (!main) return;
    const r = await E.api('/api/admin/verifications');
    const t = E.token();
    main.innerHTML = `<h1>Maombi ya uthibitisho</h1><p class="muted small">Linganisha picha ya kitambulisho na selfie. Hakikisha jina linalingana na akaunti. Kumbuka: beji ni sehemu ya Pro.</p>
      ${r.items.length ? r.items.map((v) => `<div class="a-item">
        <div class="hd"><div><b>${esc(v.business_name || v.name)}</b><div class="small muted">${esc(E.ACCT[v.account_type])} · ${esc(E.phoneLocal(v.phone))} · ${esc([v.district, v.region].filter(Boolean).join(', '))}</div>
          <div class="small">NIDA: <b>${esc(v.nida)}</b>${v.tin ? ' · TIN: <b>' + esc(v.tin) + '</b>' : ''}</div></div><span class="tiny muted">${E.timeAgo(v.created_at)}</span></div>
        <div class="a-imgs">${[['id_image', 'Kitambulisho'], ['selfie_image', 'Selfie'], ['license_image', 'Leseni']].filter(([k]) => v[k]).map(([k]) => `<img src="${E.img(v[k], t)}" data-zoom="${E.img(v[k], t)}">`).join('')}</div>
        <div class="acts"><button class="btn btn-gold btn-sm" data-a="1" data-id="${v.id}">Kubali: Verified</button>
          ${v.license_image || v.tin ? `<button class="btn btn-dark btn-sm" data-a="2" data-id="${v.id}">Kubali: Kampuni</button>` : ''}
          <button class="btn btn-danger btn-sm" data-a="no" data-id="${v.id}">Kataa</button></div></div>`).join('') : '<div class="empty"><i class="ti ti-inbox"></i>Hakuna maombi yanayosubiri.</div>'}`;
    main.onclick = async (e) => {
      const z = e.target.closest('[data-zoom]');
      if (z) return zoom(z.dataset.zoom);
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const url = '/api/admin/verifications/' + b.dataset.id;
      let ok;
      if (b.dataset.a === 'no') { const note = await ask('Sababu ya kukataa', 'Kataa', 'Mfano: Picha ya kitambulisho haisomeki'); if (note) ok = await act(url, { action: 'reject', note }, 'Limekataliwa'); }
      else ok = await act(url, { action: 'approve', level: b.dataset.a }, 'Amethibitishwa');
      if (ok) route(true);
    };
  }

  // ===== Malipo ya Pro =====
  async function proRequests() {
    const main = await shell('/pro');
    if (!main) return;
    const r = await E.api('/api/admin/pro-requests');
    main.innerHTML = `<h1>Malipo ya Pro</h1><p class="muted small">Hakikisha muamala umeingia kwenye akaunti yako ya M-Pesa/Airtel/benki kabla ya kukubali.</p>
      ${r.items.length ? r.items.map((p) => `<div class="a-item"><div class="hd"><div><b>${esc(p.business_name || p.name)}</b><div class="small muted">${esc(E.phoneLocal(p.phone))}</div>
        <div>Miezi <b>${p.months}</b> · <b>${E.money(p.amount)}</b></div><div class="small">Reference: <b>${esc(p.reference)}</b></div></div><span class="tiny muted">${E.timeAgo(p.created_at)}</span></div>
        <div class="acts"><button class="btn btn-gold btn-sm" data-a="approve" data-id="${p.id}"><i class="ti ti-check"></i> Malipo yamepokelewa</button><button class="btn btn-danger btn-sm" data-a="reject" data-id="${p.id}">Kataa</button></div></div>`).join('') : '<div class="empty"><i class="ti ti-inbox"></i>Hakuna malipo yanayosubiri.</div>'}`;
    main.onclick = async (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'reject' && !(await E.confirm('Kataa ombi hili?'))) return;
      if (await act('/api/admin/pro-requests/' + b.dataset.id, { action: b.dataset.a }, b.dataset.a === 'approve' ? 'Pro imewashwa' : 'Limekataliwa')) route(true);
    };
  }

  // ===== Ripoti =====
  async function reports() {
    const main = await shell('/reports');
    if (!main) return;
    const r = await E.api('/api/admin/reports');
    main.innerHTML = `<h1>Ripoti za matangazo</h1><p class="muted small">Tangazo lenye ripoti 3 linafichwa lenyewe mpaka uamue.</p>
      ${r.items.length ? r.items.map((x) => `<div class="a-item"><div class="hd"><div><b>${esc(E.REPORTS[x.reason] || x.reason)}</b>
        <div class="small">Tangazo: <a href="/#/l/${x.listing_id}" target="_blank" style="text-decoration:underline">${esc(x.title)}</a> <span class="badge ${(E.STATUS[x.listing_status] || [])[1]}">${(E.STATUS[x.listing_status] || [x.listing_status])[0]}</span></div>
        <div class="small muted">Muuzaji: ${esc(x.seller_business || x.seller_name)} · ${esc(E.phoneLocal(x.seller_phone))}</div>
        ${x.details ? `<div class="small mt-s">"${esc(x.details)}"</div>` : ''}${x.reporter_phone ? `<div class="tiny muted">Aliyeripoti: ${esc(E.phoneLocal(x.reporter_phone))}</div>` : ''}</div>
        <span class="tiny muted">${E.timeAgo(x.created_at)}</span></div>
        <div class="acts"><button class="btn btn-ghost btn-sm" data-a="dismiss" data-id="${x.id}">Si kweli (rudisha tangazo)</button>
        <button class="btn btn-dark btn-sm" data-a="hide" data-id="${x.id}">Ficha tangazo</button>
        <button class="btn btn-danger btn-sm" data-a="suspend" data-id="${x.id}"><i class="ti ti-ban"></i> Simamisha muuzaji</button></div></div>`).join('') : '<div class="empty"><i class="ti ti-shield-check"></i>Hakuna ripoti mpya.</div>'}`;
    main.onclick = async (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'suspend' && !(await E.confirm('Simamisha muuzaji na kuficha matangazo yake yote?'))) return;
      if (await act('/api/admin/reports/' + b.dataset.id, { action: b.dataset.a }, 'Imeshughulikiwa')) route(true);
    };
  }

  // ===== Maoni =====
  async function ratings() {
    const main = await shell('/ratings');
    if (!main) return;
    const r = await E.api('/api/admin/ratings');
    main.innerHTML = `<h1>Maoni ya wateja</h1>${r.items.length ? r.items.map((x) => `<div class="a-item"><div class="hd"><div><b>${esc(x.name)}</b> → ${esc(x.seller_business || x.seller_name)}<div>${E.stars(x.stars)}</div>
      ${x.comment ? `<div class="small">${esc(x.comment)}</div>` : ''}<div class="tiny muted">${esc(E.phoneLocal(x.phone))} · ${E.date(x.created_at)}</div></div>
      <button class="btn btn-danger btn-sm" data-del="${x.id}"><i class="ti ti-trash"></i></button></div></div>`).join('') : '<div class="empty">Bado hakuna maoni.</div>'}`;
    main.onclick = async (e) => {
      const b = e.target.closest('[data-del]');
      if (!b || !(await E.confirm('Futa maoni haya?'))) return;
      try { await E.api('/api/admin/ratings/' + b.dataset.del, { method: 'DELETE' }); E.toast('Yamefutwa', 'ok'); route(true); } catch (err) { E.toast(err.message, 'err'); }
    };
  }

  // ===== Ramani ya wauzaji =====
  async function mapPage() {
    const main = await shell('/map');
    if (!main) return;
    main.innerHTML = `<h1>Wauzaji wako wapi</h1><p class="muted small">Alama za gold: ofisi zilizowekwa na wauzaji. Duara: idadi ya wauzaji kwa mkoa.</p><div class="map big-map" id="bigMap"></div><div id="regList" class="mt"></div>`;
    const [L, r] = await Promise.all([E.loadLeaflet(), E.api('/api/admin/users?all=1')]);
    const counts = {};
    r.items.forEach((u) => { if (u.region) counts[u.region] = (counts[u.region] || 0) + 1; });
    $('#regList').innerHTML = `<div class="card"><h3>Wauzaji kwa mkoa</h3>${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="kv" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line)"><span>${esc(k)}</span><b>${n}</b></div>`).join('') || '<p class="muted">Bado hakuna.</p>'}</div>`;
    if (!L) return;
    const map = L.map('bigMap').setView([-6.4, 35.5], 6);
    E.tiles(L, map);
    Object.entries(counts).forEach(([reg, n]) => {
      const c = (window.TZ[reg] || {}).c;
      if (c) L.circleMarker(c, { radius: 8 + Math.min(30, n * 2), color: '#1F2125', weight: 1, fillColor: '#C9A24A', fillOpacity: 0.45 }).addTo(map).bindPopup(`<b>${esc(reg)}</b><br>Wauzaji ${n}`);
    });
    r.items.filter((u) => u.lat).forEach((u) => {
      L.marker([u.lat, u.lng], { icon: E.goldPin(L) }).addTo(map).bindPopup(`<b>${esc(u.business_name || u.name)}</b><br>${esc(E.ACCT[u.account_type])}<br>${esc(E.phoneLocal(u.phone))}`);
    });
  }

  // ===== Mipangilio =====
  async function settings() {
    const main = await shell('/settings');
    if (!main) return;
    const s = await E.api('/api/admin/settings');
    const f = (k, label, hint = '', type = 'input') => `<div class="field"><label>${label}</label>${type === 'textarea' ? `<textarea class="input" name="${k}">${esc(s[k])}</textarea>` : `<input class="input" name="${k}" value="${esc(s[k])}">`}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
    main.innerHTML = `<h1>Mipangilio</h1><form id="sf" class="form-sec">
      <div class="grid2">${f('free_limit', 'Matangazo ya bure (idadi)')}${f('pro_limit', 'Matangazo ya Pro (idadi)')}</div>
      <div class="grid2">${f('pro_price_month', 'Bei ya Pro kwa mwezi (TZS)')}${f('featured_price_week', 'Bei ya tangazo maalum kwa wiki (TZS)')}</div>
      <div class="grid2">${f('support_phone', 'Namba ya msaada', 'Mfumo: 255XXXXXXXXX')}${f('support_email', 'Email ya msaada')}</div>
      ${f('pay_instructions', 'Maelekezo ya kulipia Pro', 'Weka namba ya Lipa kwa M-Pesa / Airtel Money / akaunti ya benki', 'textarea')}
      <button class="btn btn-gold">Hifadhi</button></form>`;
    $('#sf').onsubmit = async (e) => {
      e.preventDefault();
      try { await E.api('/api/admin/settings', { method: 'PUT', body: E.formData(e.target) }); E.toast('Imehifadhiwa', 'ok'); } catch (err) { E.toast(err.message, 'err'); }
    };
  }

  // ===== Router =====
  async function route() {
    if (!E.token()) return login();
    E.closeModal();
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, q] = h.split('?');
    const params = Object.fromEntries(new URLSearchParams(q || ''));
    try {
      if (path === '/listings') return await listings(params);
      if (path === '/users') return await users(params);
      if (path === '/verify') return await verifications();
      if (path === '/pro') return await proRequests();
      if (path === '/reports') return await reports();
      if (path === '/ratings') return await ratings();
      if (path === '/map') return await mapPage();
      if (path === '/settings') return await settings();
      return await overview();
    } catch (e) {
      if (e.status === 401 || e.status === 403) { localStorage.removeItem('est_admin'); return login(); }
      E.toast(e.message, 'err');
    }
  }
  window.addEventListener('hashchange', () => route());
  route();
})();
