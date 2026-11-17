// 88EST - Portal ya madalali, developers na wenye mali
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = E.esc;
  const root = $('#root');

  // Admin akiingia kwa niaba ya muuzaji, token inakaa kwenye tab hii tu
  const urlImp = new URLSearchParams(location.search).get('imp');
  if (urlImp) {
    sessionStorage.setItem('est_imp', urlImp);
    history.replaceState(null, '', '/portal.html' + location.hash);
  }
  const IMP = !!sessionStorage.getItem('est_imp');
  E.token = () => sessionStorage.getItem('est_imp') || localStorage.getItem('est_token') || '';

  const S = { me: null, limits: null, cfg: null, verPending: false };

  function setMe(r) {
    S.me = r.user;
    S.limits = r.limits;
    S.verPending = r.verification_pending;
  }

  async function loadMe() {
    if (!E.token()) return false;
    try {
      setMe(await E.api('/api/me'));
      return true;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        if (IMP) sessionStorage.removeItem('est_imp');
        else localStorage.removeItem('est_token');
        if (e.status === 403) E.toast(e.message, 'err');
      }
      return false;
    }
  }

  function logout() {
    if (IMP) { sessionStorage.removeItem('est_imp'); window.close(); location.href = '/admin.html'; return; }
    localStorage.removeItem('est_token');
    S.me = null;
    location.hash = '#/login';
    route();
  }

  // ===== Kuingia na kujisajili =====
  function authPage(mode) {
    document.title = (mode === 'register' ? 'Jisajili' : 'Ingia') + ' | 88EST';
    root.innerHTML = `
      <div class="auth-wrap">
        <div style="width:100%;max-width:460px;display:flex;justify-content:space-between;align-items:center"><a href="/">${E.logo(true)}</a>${E.langButton('dark')}</div>
        <p style="color:var(--grey2);margin:10px 0 0;text-align:center;font-size:14px">Portal ya madalali, developers na wenye mali</p>
        <div class="auth-card">
          <div class="auth-tabs"><a href="#/login" class="${mode === 'login' ? 'on' : ''}">Ingia</a><a href="#/register" class="${mode === 'register' ? 'on' : ''}">Jisajili bure</a></div>
          <div id="authBody"></div>
        </div>
        <a href="/" style="color:var(--grey2);margin-top:18px;font-size:13px"><i class="ti ti-arrow-left"></i> Rudi kwenye 88EST</a>
      </div>`;
    const body = $('#authBody');
    if (mode === 'register') {
      body.innerHTML = `
        <form id="rf">
          <div class="field"><label>Wewe ni nani?</label>
            <div class="type-pick">
              <label><input type="radio" name="account_type" value="agent" checked><i class="ti ti-user-star"></i>Dalali</label>
              <label><input type="radio" name="account_type" value="developer"><i class="ti ti-crane"></i>Developer</label>
              <label><input type="radio" name="account_type" value="owner"><i class="ti ti-home-heart"></i>Mwenye mali</label>
            </div></div>
          <div class="field"><label>Jina kamili *</label><input class="input" name="name" required autocomplete="name"></div>
          <div class="field"><label>Jina la biashara/kampuni</label><input class="input" name="business_name" placeholder="Mfano: Juma Properties (si lazima)"></div>
          <div class="field"><label>Namba ya simu *</label><input class="input" name="phone" inputmode="tel" placeholder="0712 345 678" required autocomplete="tel"></div>
          <div class="field"><label>Email *</label><input class="input" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label>Namba ya WhatsApp</label><input class="input" name="whatsapp" inputmode="tel" placeholder="Kama ni tofauti na ya simu"></div>
          <div class="grid2">
            <div class="field"><label>Mkoa unaopatikana *</label><select class="input" name="region" id="rReg" required>${E.regionOptions('Dar es Salaam')}</select></div>
            <div class="field"><label>Wilaya *</label><select class="input" name="district" id="rDis" required>${E.districtOptions('Dar es Salaam')}</select></div>
          </div>
          <div class="field"><label>Kata / Mtaa</label><input class="input" name="ward" placeholder="Mfano: Sinza"></div>
          <div class="field"><label>Maeneo unayofanyia kazi</label><input class="input" name="service_areas" placeholder="Mfano: Kinondoni, Ubungo, Kigamboni"></div>
          <div class="field"><label>Password *</label><input class="input" name="password" type="password" minlength="6" required autocomplete="new-password"><div class="hint">Angalau herufi 6</div></div>
          <p class="tiny muted">Kwa kujisajili unakubali kuweka matangazo ya kweli tu. 88EST ni jukwaa la kuunganisha; wewe unawajibika kwa matangazo yako.</p>
          <button class="btn btn-gold btn-block">Fungua akaunti</button>
        </form>`;
      E.bindRegion(body, '#rReg', '#rDis');
      $('#rf').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button.btn');
        E.busy(btn, true);
        try {
          const r = await E.api('/api/auth/register', { body: E.formData(e.target), token: '' });
          localStorage.setItem('est_token', r.token);
          setMe(r);
          E.toast('Karibu 88EST! Akaunti imefunguliwa.', 'ok');
          location.hash = sessionStorage.getItem('est_after') || '#/';
          sessionStorage.removeItem('est_after');
        } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
      };
    } else {
      body.innerHTML = `
        <form id="lf">
          <div class="field"><label>Namba ya simu</label><input class="input" name="phone" inputmode="tel" placeholder="0712 345 678" required autocomplete="tel"></div>
          <div class="field"><label>Password</label><input class="input" name="password" type="password" required autocomplete="current-password"></div>
          <button class="btn btn-dark btn-block">Ingia</button>
          <p class="small muted center mt">Umesahau password? Wasiliana na 88EST kupitia WhatsApp tukusaidie.</p>
        </form>`;
      $('#lf').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        E.busy(btn, true);
        try {
          const r = await E.api('/api/auth/login', { body: E.formData(e.target), token: '' });
          if (r.user.role === 'admin') {
            localStorage.setItem('est_admin', r.token);
            location.href = '/admin.html';
            return;
          }
          localStorage.setItem('est_token', r.token);
          setMe(r);
          location.hash = sessionStorage.getItem('est_after') || '#/';
          sessionStorage.removeItem('est_after');
        } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
      };
    }
  }

  // ===== Muundo wa portal =====
  const TABS = [
    ['/', 'ti-layout-dashboard', 'Dashibodi'],
    ['/listings', 'ti-list-details', 'Matangazo yangu'],
    ['/new', 'ti-circle-plus', 'Weka tangazo'],
    ['/profile', 'ti-user-circle', 'Wasifu'],
    ['/verify', 'ti-rosette-discount-check', 'Verified'],
    ['/pro', 'ti-crown', 'Pro'],
  ];
  function shell(active) {
    const u = S.me;
    root.innerHTML = `
      ${IMP ? `<div class="imp-bar"><span><i class="ti ti-user-shield"></i> Admin: unafanya kazi kama ${esc(u.business_name || u.name)}</span><button class="btn btn-dark btn-sm" id="impExit">Toka</button></div>` : ''}
      <div class="p-top"><a href="/">${E.logo(true)}</a>
        <div class="row gap">${E.langButton('dark')}<div class="who"><b>${esc(u.business_name || u.name)}</b>${esc(E.ACCT[u.account_type])}${u.pro ? ' · PRO' : ''}</div></div></div>
      <nav class="p-tabs">${TABS.map(([h, i, t]) => `<a href="#${h}" class="${active === h ? 'on' : ''}"><i class="ti ${i}"></i>${t}</a>`).join('')}</nav>
      <main class="p-main" id="main"></main>`;
    if (IMP) $('#impExit').onclick = logout;
    document.title = (TABS.find((t) => t[0] === active) || [0, 0, 'Portal'])[2] + ' | 88EST';
    return $('#main');
  }

  // ===== Dashibodi =====
  async function dashboard() {
    const main = shell('/');
    const u = S.me;
    const link = location.origin + '/a/' + u.slug;
    main.innerHTML = `
      <h1>Habari, ${esc(u.name.split(' ')[0])}</h1>
      <p class="muted" style="margin-top:-4px">Hapa unasimamia matangazo yako yote.</p>
      <div id="alerts"></div>
      <div class="stats" id="stats">${'<div class="stat skel" style="height:74px"></div>'.repeat(6)}</div>
      <div class="card mt">
        <div class="row between"><h3 style="margin:0">Ukurasa wako wa umma</h3>${E.badges(u)}</div>
        <p class="small muted">Shiriki link hii kwenye WhatsApp, Instagram na Facebook. Wateja wataona matangazo yako yote.</p>
        <div class="copy-box"><span>${esc(link)}</span><button class="btn btn-gold btn-sm" id="copyLink"><i class="ti ti-copy"></i> Nakili</button></div>
        <div class="row gap mt-s"><a class="btn btn-ghost btn-sm" href="/#/a/${esc(u.slug)}" target="_blank"><i class="ti ti-eye"></i> Angalia</a>
        <a class="btn btn-ghost btn-sm" href="https://wa.me/?text=${encodeURIComponent('Angalia mali zangu kwenye 88EST: ' + link)}" target="_blank"><i class="ti ti-brand-whatsapp"></i> Shiriki WhatsApp</a></div>
      </div>
      <div class="card">
        <div class="row between"><h3 style="margin:0">Mpango wako</h3><a href="#/pro" class="small gold" style="font-weight:600">${u.pro ? 'Ongeza muda' : 'Jiunge na Pro'} <i class="ti ti-chevron-right"></i></a></div>
        <p class="small" style="margin:8px 0 6px">${u.pro ? `<span class="badge badge-dark">PRO</span> mpaka ${E.date(u.pro_until)}` : '<span class="badge badge-light">Bure</span>'} · Matangazo ${S.limits.used} kati ya ${S.limits.max}</p>
        <div style="height:8px;background:var(--off);border-radius:8px;overflow:hidden"><div style="height:100%;width:${Math.min(100, (S.limits.used / Math.max(1, S.limits.max)) * 100)}%;background:var(--gold)"></div></div>
      </div>
      <a class="btn btn-gold btn-block mt" href="#/new"><i class="ti ti-circle-plus"></i> Weka tangazo jipya</a>`;
    $('#copyLink').onclick = () => copy(link);

    // Arifa muhimu
    const al = [];
    if (!u.phone_verified) {
      al.push(`<div class="alert alert-gold"><i class="ti ti-device-mobile-message"></i><div class="grow">
        <b>Thibitisha namba yako ya simu</b><div class="small">Tumetuma code ya tarakimu 6 kwa SMS kwenda ${esc(E.phoneLocal(u.phone))}.</div>
        <form id="otpF" class="row gap mt-s"><input class="input" name="code" inputmode="numeric" maxlength="6" placeholder="Code" style="max-width:140px"><button class="btn btn-dark btn-sm">Thibitisha</button><button type="button" class="btn btn-ghost btn-sm" id="otpRe">Tuma tena</button></form></div></div>`);
    }
    if (u.verify_level === 0 && !S.verPending) {
      al.push(`<div class="alert alert-dark"><i class="ti ti-rosette-discount-check gold"></i><div class="grow"><b>Pata beji ya Verified</b><div class="small" style="opacity:.85">Wateja wanaamini zaidi wauzaji waliothibitishwa, na matangazo yako yanaonekana juu.</div><a href="#/verify" class="btn btn-gold btn-sm mt-s">Anza sasa</a></div></div>`);
    }
    $('#alerts').innerHTML = al.join('');
    const otpF = $('#otpF');
    if (otpF) {
      otpF.onsubmit = async (e) => {
        e.preventDefault();
        try {
          setMe(await E.api('/api/otp/verify', { body: E.formData(e.target) }));
          E.toast('Namba imethibitishwa', 'ok');
          dashboard();
        } catch (err) { E.toast(err.message, 'err'); }
      };
      $('#otpRe').onclick = async () => {
        try { const r = await E.api('/api/otp/send', { body: {} }); E.toast(r.message || 'Imetumwa', r.sent ? 'ok' : ''); }
        catch (err) { E.toast(err.message, 'err'); }
      };
    }

    try {
      const s = await E.api('/api/my/stats');
      const box = [
        ['ti-circle-check', s.approved, 'Hewani'], ['ti-clock', s.pending, 'Zinasubiri'], ['ti-eye', s.views, 'Walioona'],
        ['ti-phone', s.calls, 'Simu'], ['ti-brand-whatsapp', s.whatsapp, 'WhatsApp'], ['ti-star', s.rating ? s.rating + ' (' + s.rating_count + ')' : '-', 'Maoni'],
      ];
      $('#stats').innerHTML = box.map(([i, n, t]) => `<div class="stat"><i class="ti ${i}"></i><b>${esc(n)}</b><span>${t}</span></div>`).join('');
      if (s.rejected) $('#alerts').insertAdjacentHTML('beforeend', `<div class="alert alert-red"><i class="ti ti-alert-triangle"></i><div><b>Matangazo ${s.rejected} yamekataliwa</b><div class="small">Angalia sababu kisha uyarekebishe. <a href="#/listings" style="text-decoration:underline">Fungua</a></div></div></div>`);
    } catch (e) { $('#stats').innerHTML = ''; }
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); E.toast('Imenakiliwa', 'ok'); } catch (e) { prompt('Nakili:', text); }
  }

  // ===== Matangazo yangu =====
  async function myListings() {
    const main = shell('/listings');
    main.innerHTML = `<div class="row between mb"><h1 style="margin:0">Matangazo yangu</h1><a class="btn btn-gold btn-sm" href="#/new"><i class="ti ti-plus"></i> Jipya</a></div><div id="lst"><div class="empty"><span class="spin"></span></div></div>`;
    let items;
    try { items = (await E.api('/api/my/listings')).items; } catch (e) { $('#lst').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    if (!items.length) {
      $('#lst').innerHTML = '<div class="empty"><i class="ti ti-home-plus"></i>Bado hujaweka tangazo.<br><a class="btn btn-gold mt" href="#/new">Weka tangazo la kwanza</a></div>';
      return;
    }
    $('#lst').innerHTML = items.map((l) => {
      const st = E.STATUS[l.status] || [l.status, ''];
      return `<div class="lrow">
        <div class="ph"><img src="${E.img((l.photos || [])[0])}" alt=""></div>
        <div class="bd">
          <div class="row between gap"><div class="tt">${esc(l.title)}</div></div>
          <div class="small">${l.price ? E.money(l.price) + E.per(l.price_period) : 'Maelewano'}</div>
          <div class="mini"><span class="badge ${st[1]}">${st[0]}</span>${l.featured ? '<span class="badge badge-gold"><i class="ti ti-star"></i> Maalum</span>' : ''}
            <span><i class="ti ti-eye"></i> ${l.views}</span><span><i class="ti ti-phone"></i> ${l.leads_call}</span><span><i class="ti ti-brand-whatsapp"></i> ${l.leads_wa}</span></div>
          ${l.status === 'rejected' && l.reject_reason ? `<div class="small" style="color:var(--red)"><b>Sababu:</b> ${esc(l.reject_reason)}</div>` : ''}
          ${l.status === 'hidden' ? '<div class="small muted">Limefichwa na admin kwa uchunguzi. Wasiliana na 88EST.</div>' : ''}
          <div class="acts">
            <a class="btn btn-ghost btn-sm" href="#/edit/${l.id}"><i class="ti ti-edit"></i> Hariri</a>
            <a class="btn btn-ghost btn-sm" href="/#/l/${l.id}" target="_blank"><i class="ti ti-eye"></i> Ona</a>
            ${l.status === 'approved' ? `<button class="btn btn-ghost btn-sm" data-act="taken" data-id="${l.id}"><i class="ti ti-check"></i> Imechukuliwa</button>` : ''}
            ${l.status === 'approved' ? `<button class="btn btn-ghost btn-sm" data-act="share" data-id="${l.id}"><i class="ti ti-share"></i> Shiriki</button>` : ''}
            ${l.status === 'taken' ? `<button class="btn btn-ghost btn-sm" data-act="relist" data-id="${l.id}"><i class="ti ti-refresh"></i> Rudisha hewani</button>` : ''}
            <button class="btn btn-danger btn-sm" data-act="delete" data-id="${l.id}"><i class="ti ti-trash"></i></button>
          </div>
        </div></div>`;
    }).join('');
    $('#lst').onclick = async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const id = b.dataset.id;
      const act = b.dataset.act;
      try {
        if (act === 'share') return copy(location.origin + '/l/' + id);
        if (act === 'delete') {
          if (!(await E.confirm('Futa tangazo hili kabisa?'))) return;
          await E.api('/api/my/listings/' + id, { method: 'DELETE' });
          E.toast('Tangazo limefutwa', 'ok');
        } else {
          await E.api('/api/my/listings/' + id + '/status', { body: { status: act } });
          E.toast(act === 'taken' ? 'Limewekwa kama limechukuliwa' : 'Limetumwa kwa ukaguzi', 'ok');
        }
        await loadMe();
        myListings();
      } catch (err) { E.toast(err.message, 'err'); }
    };
  }

  // ===== Fomu ya tangazo =====
  async function listingForm(id) {
    const main = shell(id ? '/listings' : '/new');
    let l = { category: '', deal: 'rent', price_period: 'month', region: S.me.region || 'Dar es Salaam', district: S.me.district || '', ward: S.me.ward || '', amenities: [], photos: [] };
    if (id) {
      main.innerHTML = '<div class="empty"><span class="spin"></span></div>';
      try { l = await E.api('/api/my/listings/' + id); } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    } else if (S.limits.used >= S.limits.max) {
      main.innerHTML = `<div class="empty"><i class="ti ti-lock"></i><b>Umefikia kikomo cha matangazo ${S.limits.max}</b><br>Jiunge na Pro upate nafasi ya matangazo zaidi, au weka matangazo yaliyokwisha kama "Imechukuliwa".<br><a class="btn btn-gold mt" href="#/pro">Jiunge na Pro</a></div>`;
      return;
    }
    let photos = (l.photos || []).slice();
    let pin = l.lat ? [l.lat, l.lng] : null;
    const yn = (name, v) => `<select class="input" name="${name}"><option value="" ${v == null ? 'selected' : ''}>Sijui / haihusiki</option><option value="true" ${v === true ? 'selected' : ''}>Ndiyo</option><option value="false" ${v === false ? 'selected' : ''}>Hapana</option></select>`;

    main.innerHTML = `
      <h1>${id ? 'Hariri tangazo' : 'Weka tangazo jipya'}</h1>
      ${id && l.status === 'approved' ? '<div class="alert alert-gold"><i class="ti ti-info-circle"></i><div class="small">Ukihifadhi mabadiliko, tangazo litakaguliwa tena kabla ya kurudi hewani.</div></div>' : ''}
      <form id="lf" novalidate>
        <div class="form-sec"><h3><span class="n">1</span> Aina ya mali</h3>
          <div class="cat-pick">${E.CATS.map((c) => `<label><input type="radio" name="category" value="${c.k}" ${l.category === c.k ? 'checked' : ''}><i class="ti ${c.icon}"></i>${c.label}</label>`).join('')}</div>
          <div class="field mt" id="dealBox"><label>Huduma</label>
            <div class="seg">${[['rent', 'Kupangisha'], ['sale', 'Kuuza']].map(([k, t]) => `<label><input type="radio" name="deal" value="${k}" ${l.deal === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
        </div>

        <div class="form-sec"><h3><span class="n">2</span> Picha</h3>
          <p class="small muted" style="margin-top:-6px">Weka picha halisi za mali hii (mpaka 12). Picha ya kwanza ndiyo itaonekana kwanza.</p>
          <div class="photos" id="photos"></div>
          <input type="file" id="fileIn" accept="image/*" multiple hidden>
        </div>

        <div class="form-sec"><h3><span class="n">3</span> Bei na maelezo</h3>
          <div class="field"><label>Kichwa cha tangazo *</label><input class="input" name="title" maxlength="120" value="${esc(l.title || '')}" placeholder="Mfano: Nyumba ya vyumba 3 Mbezi Beach"></div>
          <div class="grid2">
            <div class="field"><label>Bei (TZS) *</label><input class="input" name="price" inputmode="numeric" value="${l.price != null ? Number(l.price).toLocaleString('en-US') : ''}" placeholder="500,000"><div class="hint">Weka 0 kama ni kwa maelewano</div></div>
            <div class="field" id="perBox"><label>Kwa</label><select class="input" name="price_period" id="perSel"></select></div>
          </div>
          <div class="grid2">
            <div class="field" id="advBox"><label>Miezi ya kulipa mbele</label><select class="input" name="advance_months">${['', 1, 3, 6, 12, 24].map((m) => `<option value="${m}" ${String(l.advance_months || '') === String(m) ? 'selected' : ''}>${m ? 'Miezi ' + m : 'Chagua'}</option>`).join('')}</select></div>
            <div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" name="negotiable" value="true" ${l.negotiable ? 'checked' : ''}> Bei inajadilika</label></div>
          </div>
          <div class="grid2">
            <div class="field"><label>Ada ya udalali</label><input class="input" name="agent_fee" value="${esc(l.agent_fee || '')}" placeholder="Mf. kodi ya mwezi 1 / Hakuna"></div>
            <div class="field"><label>Ada ya kuona mali</label><input class="input" name="viewing_fee" value="${esc(l.viewing_fee || '')}" placeholder="Mf. TZS 10,000 / Hakuna"></div>
          </div>
          <div class="field"><label>Maelezo</label><textarea class="input" name="description" maxlength="4000" placeholder="Eleza mali: hali yake, mazingira, umbali kutoka barabarani, masharti ya mpangaji, n.k.">${esc(l.description || '')}</textarea></div>
        </div>

        <div class="form-sec"><h3><span class="n">4</span> Mahali</h3>
          <div class="grid2">
            <div class="field"><label>Mkoa *</label><select class="input" name="region" id="lReg">${E.regionOptions(l.region)}</select></div>
            <div class="field"><label>Wilaya *</label><select class="input" name="district" id="lDis">${E.districtOptions(l.region, l.district)}</select></div>
          </div>
          <div class="field"><label>Kata / Mtaa</label><input class="input" name="ward" value="${esc(l.ward || '')}" placeholder="Mfano: Mbezi Beach"></div>
          <div class="field"><label>Alama kwenye ramani (si lazima)</label>
            <div class="map" id="pinMap"></div>
            <div class="hint">Gusa ramani kuweka alama. Wateja wataona eneo kwa kukadiria tu (si mahali halisi).</div>
            <button type="button" class="btn btn-ghost btn-sm mt-s" id="myLoc"><i class="ti ti-current-location"></i> Tumia mahali nilipo sasa</button>
            <button type="button" class="btn btn-ghost btn-sm mt-s" id="clrPin"><i class="ti ti-x"></i> Ondoa alama</button>
          </div>
        </div>

        <div class="form-sec"><h3><span class="n">5</span> Sifa za mali</h3>
          <div id="grpRes" class="grid2">
            <div class="field"><label>Vyumba vya kulala</label><input class="input" name="bedrooms" inputmode="numeric" value="${l.bedrooms ?? ''}"></div>
            <div class="field"><label>Bafu / Vyoo</label><input class="input" name="bathrooms" inputmode="numeric" value="${l.bathrooms ?? ''}"></div>
          </div>
          <div class="grid2">
            <div class="field"><label>Ukubwa</label><input class="input" name="size" inputmode="decimal" value="${l.size ?? ''}"></div>
            <div class="field"><label>Kipimo</label><select class="input" name="size_unit">${['sqm', 'ekari', 'hekta', 'futi za mraba'].map((u) => `<option ${l.size_unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
          </div>
          <div id="grpLand" class="grid2">
            <div class="field"><label>Hati miliki ipo?</label>${yn('title_deed', l.title_deed)}</div>
            <div class="field"><label>Kimepimwa?</label>${yn('surveyed', l.surveyed)}</div>
          </div>
          <div id="grpProj">
            <div class="grid3">
              <div class="field"><label>Units zote</label><input class="input" name="units_total" inputmode="numeric" value="${l.units_total ?? ''}"></div>
              <div class="field"><label>Zilizobaki</label><input class="input" name="units_available" inputmode="numeric" value="${l.units_available ?? ''}"></div>
              <div class="field"><label>Hatua</label><select class="input" name="project_status"><option value="">Chagua</option>${Object.entries(E.PROJECT_STATUS).map(([k, t]) => `<option value="${k}" ${l.project_status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            </div>
            <div class="field"><label>Mpango wa malipo</label><textarea class="input" name="payment_plan" style="min-height:80px" placeholder="Mfano: 30% mwanzo, kisha awamu 6 kila mwezi">${esc(l.payment_plan || '')}</textarea></div>
          </div>
          <div class="field" id="amenBox"><label>Huduma zilizopo</label>
            <div class="check-grid">${Object.entries(E.AMEN).map(([k, [t, i]]) => `<label class="check" data-am="${k}"><input type="checkbox" name="amenities" value="${k}" ${(l.amenities || []).includes(k) ? 'checked' : ''}><i class="ti ${i}"></i>${t}</label>`).join('')}</div></div>
        </div>

        <div class="sticky-save"><button class="btn btn-gold btn-block" id="saveBtn"><i class="ti ti-send"></i> ${id ? 'Hifadhi mabadiliko' : 'Tuma kwa ukaguzi'}</button>
          <p class="tiny muted center" style="margin:6px 0 0">Tangazo litaonekana hewani baada ya kukaguliwa na timu ya 88EST.</p></div>
      </form>`;

    const form = $('#lf');
    E.bindRegion(form, '#lReg', '#lDis');

    // Picha
    const box = $('#photos');
    const fileIn = $('#fileIn');
    function drawPhotos() {
      box.innerHTML = photos.map((p, i) => `<div class="p ${p === 'loading' ? 'loading skel' : ''}">${p === 'loading' ? '' : `<img src="${E.img(p)}" alt="">`}
        ${p !== 'loading' ? `<button type="button" class="rm" data-rm="${i}" aria-label="Ondoa"><i class="ti ti-x"></i></button>` : ''}
        ${i === 0 && p !== 'loading' ? '<span class="cover">Ya kwanza</span>' : p !== 'loading' ? `<button type="button" class="mk" data-cover="${i}">Weka kwanza</button>` : ''}</div>`).join('')
        + (photos.length < 12 ? '<div class="add" id="addPh"><i class="ti ti-camera-plus"></i>Ongeza picha</div>' : '');
      const add = $('#addPh');
      if (add) add.onclick = () => fileIn.click();
    }
    box.onclick = (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { photos.splice(Number(rm.dataset.rm), 1); drawPhotos(); return; }
      const cv = e.target.closest('[data-cover]');
      if (cv) { const i = Number(cv.dataset.cover); photos.unshift(photos.splice(i, 1)[0]); drawPhotos(); }
    };
    fileIn.onchange = async () => {
      const files = Array.from(fileIn.files).slice(0, 12 - photos.length);
      fileIn.value = '';
      for (const f of files) {
        photos.push('loading');
        drawPhotos();
        try {
          const pid = await E.upload(f);
          photos[photos.indexOf('loading')] = pid;
        } catch (err) {
          photos.splice(photos.indexOf('loading'), 1);
          E.toast(err.message, 'err');
        }
        drawPhotos();
      }
    };
    drawPhotos();

    // Sehemu zinazobadilika kulingana na aina ya mali
    function sync() {
      const cat = (form.querySelector('[name=category]:checked') || {}).value || '';
      const short = cat === 'short_stay';
      $('#dealBox').classList.toggle('hide', short);
      const deal = short ? 'short' : (form.querySelector('[name=deal]:checked') || {}).value || 'rent';
      const per = $('#perSel');
      const cur = per.value || l.price_period;
      const opts = deal === 'sale' ? [['total', 'Bei ya jumla']] : deal === 'short' ? [['night', 'Usiku'], ['day', 'Siku']] : [['month', 'Mwezi'], ['year', 'Mwaka']];
      per.innerHTML = opts.map(([k, t]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${t}</option>`).join('');
      $('#advBox').classList.toggle('hide', deal !== 'rent');
      const land = E.LAND.includes(cat);
      $('#grpRes').classList.toggle('hide', land || cat === 'ghala' || cat === 'ukumbi');
      $('#grpLand').classList.toggle('hide', !(land || cat === 'nyumba' || cat === 'mradi'));
      $('#grpProj').classList.toggle('hide', cat !== 'mradi');
      const landAm = ['maji', 'luku_binafsi', 'uzio', 'barabara_lami', 'karibu_barabara'];
      form.querySelectorAll('[data-am]').forEach((el) => el.classList.toggle('hide', land && !landAm.includes(el.dataset.am)));
    }
    form.addEventListener('change', (e) => { if (e.target.name === 'category' || e.target.name === 'deal') sync(); });
    sync();

    // Ramani
    E.loadLeaflet().then((L) => {
      const el = $('#pinMap');
      if (!L || !el) return;
      const start = pin || (window.TZ[form.region.value] || {}).c || [-6.7924, 39.2083];
      const map = L.map(el).setView(start, pin ? 15 : 11);
      E.tiles(L, map);
      let mk = pin ? L.marker(pin, { icon: E.goldPin(L) }).addTo(map) : null;
      const setPin = (ll) => { pin = [ll.lat, ll.lng]; if (mk) mk.setLatLng(ll); else mk = L.marker(ll, { icon: E.goldPin(L) }).addTo(map); };
      map.on('click', (e) => setPin(e.latlng));
      $('#lReg').addEventListener('change', () => { const c = (window.TZ[form.region.value] || {}).c; if (c && !pin) map.setView(c, 11); });
      $('#myLoc').onclick = () => {
        if (!navigator.geolocation) return E.toast('Simu yako haiwezi kutoa mahali', 'err');
        navigator.geolocation.getCurrentPosition((p) => { const ll = L.latLng(p.coords.latitude, p.coords.longitude); setPin(ll); map.setView(ll, 16); },
          () => E.toast('Ruhusu "location" kwenye browser', 'err'), { enableHighAccuracy: true, timeout: 10000 });
      };
      $('#clrPin').onclick = () => { pin = null; if (mk) { map.removeLayer(mk); mk = null; } };
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (photos.includes('loading')) return E.toast('Subiri picha zimalize kupakia', 'err');
      const d = E.formData(form);
      if (!d.category) return E.toast('Chagua aina ya mali', 'err');
      d.amenities = [].concat(d.amenities || []);
      d.photos = photos;
      d.price = String(d.price || '').replace(/[^\d]/g, '');
      d.negotiable = !!d.negotiable;
      if (d.category === 'short_stay') d.deal = 'short';
      d.lat = pin ? pin[0] : null;
      d.lng = pin ? pin[1] : null;
      const btn = $('#saveBtn');
      E.busy(btn, true, 'Inahifadhi...');
      try {
        await E.api(id ? '/api/my/listings/' + id : '/api/my/listings', { method: id ? 'PUT' : 'POST', body: d });
        await loadMe();
        E.toast(id ? 'Mabadiliko yamehifadhiwa' : 'Tangazo limetumwa kwa ukaguzi', 'ok');
        location.hash = '#/listings';
      } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
    };
  }

  // ===== Wasifu =====
  function profile() {
    const main = shell('/profile');
    const u = S.me;
    let avatar = u.avatar_id;
    let pin = u.lat ? [u.lat, u.lng] : null;
    main.innerHTML = `
      <h1>Wasifu wangu</h1>
      <form id="pf">
        <div class="form-sec">
          <div class="row gap mb"><div class="avatar" id="av" style="width:72px;height:72px;font-size:26px">${avatar ? `<img src="${E.img(avatar)}">` : esc(u.name[0])}</div>
            <div><button type="button" class="btn btn-ghost btn-sm" id="avBtn"><i class="ti ti-camera"></i> Badilisha picha/logo</button><div class="hint">Picha yako au logo ya kampuni</div></div>
            <input type="file" id="avIn" accept="image/*" hidden></div>
          <div class="field"><label>Aina ya akaunti</label>
            <div class="type-pick">${Object.entries(E.ACCT).map(([k, t]) => `<label><input type="radio" name="account_type" value="${k}" ${u.account_type === k ? 'checked' : ''}><i class="ti ${{ agent: 'ti-user-star', developer: 'ti-crane', owner: 'ti-home-heart' }[k]}"></i>${t}</label>`).join('')}</div></div>
          <div class="field"><label>Jina kamili</label><input class="input" name="name" value="${esc(u.name)}"></div>
          <div class="field"><label>Jina la biashara/kampuni</label><input class="input" name="business_name" value="${esc(u.business_name || '')}"></div>
          <div class="field"><label>Namba ya simu</label><input class="input" value="${esc(E.phoneLocal(u.phone))}" disabled><div class="hint">${u.phone_verified ? '<i class="ti ti-check gold"></i> Imethibitishwa' : 'Bado haijathibitishwa'} · Kubadilisha namba wasiliana na 88EST</div></div>
          <div class="field"><label>Email</label><input class="input" name="email" type="email" value="${esc(u.email || '')}"></div>
          <div class="field"><label>Namba ya WhatsApp</label><input class="input" name="whatsapp" inputmode="tel" value="${esc(E.phoneLocal(u.whatsapp === u.phone ? '' : u.whatsapp))}" placeholder="Kama ni tofauti na ya simu"></div>
          <div class="field"><label>Kuhusu wewe / biashara yako</label><textarea class="input" name="bio" maxlength="1000" placeholder="Mfano: Tunapangisha na kuuza nyumba Kinondoni tangu 2015...">${esc(u.bio || '')}</textarea></div>
        </div>
        <div class="form-sec"><h3><i class="ti ti-map-pin gold"></i> Mahali unapopatikana</h3>
          <div class="grid2">
            <div class="field"><label>Mkoa</label><select class="input" name="region" id="pReg">${E.regionOptions(u.region)}</select></div>
            <div class="field"><label>Wilaya</label><select class="input" name="district" id="pDis">${E.districtOptions(u.region, u.district)}</select></div>
          </div>
          <div class="field"><label>Kata / Mtaa</label><input class="input" name="ward" value="${esc(u.ward || '')}"></div>
          <div class="field"><label>Maeneo unayofanyia kazi</label><input class="input" name="service_areas" value="${esc(u.service_areas || '')}" placeholder="Mfano: Kinondoni, Ubungo"></div>
          <div class="field"><label>Ofisi kwenye ramani (si lazima)</label><div class="map" id="ofMap"></div>
            <div class="hint"><i class="ti ti-lock"></i> Alama hii inaonekana kwa admin wa 88EST tu, si kwa umma.</div></div>
        </div>
        <button class="btn btn-gold btn-block" id="pSave">Hifadhi wasifu</button>
      </form>
      <div class="form-sec mt"><h3><i class="ti ti-lock gold"></i> Badilisha password</h3>
        <form id="pwf"><div class="grid2"><input class="input" type="password" name="old" placeholder="Password ya sasa" required><input class="input" type="password" name="new" placeholder="Password mpya" minlength="6" required></div>
        <button class="btn btn-dark btn-sm mt-s">Badilisha</button></form></div>
      <button class="btn btn-ghost btn-block" id="out"><i class="ti ti-logout"></i> Toka (logout)</button>`;
    const form = $('#pf');
    E.bindRegion(form, '#pReg', '#pDis');
    $('#avBtn').onclick = () => $('#avIn').click();
    $('#avIn').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      $('#av').innerHTML = '<span class="spin"></span>';
      try { avatar = await E.upload(f); $('#av').innerHTML = `<img src="${E.img(avatar)}">`; } catch (err) { E.toast(err.message, 'err'); }
    };
    E.loadLeaflet().then((L) => {
      if (!L || !$('#ofMap')) return;
      const map = L.map('ofMap').setView(pin || (window.TZ[u.region] || {}).c || [-6.79, 39.21], pin ? 15 : 11);
      E.tiles(L, map);
      let mk = pin ? L.marker(pin, { icon: E.goldPin(L) }).addTo(map) : null;
      map.on('click', (e) => { pin = [e.latlng.lat, e.latlng.lng]; if (mk) mk.setLatLng(e.latlng); else mk = L.marker(e.latlng, { icon: E.goldPin(L) }).addTo(map); });
    });
    form.onsubmit = async (e) => {
      e.preventDefault();
      const d = E.formData(form);
      d.avatar_id = avatar;
      d.lat = pin ? pin[0] : null;
      d.lng = pin ? pin[1] : null;
      const btn = $('#pSave');
      E.busy(btn, true);
      try { setMe(await E.api('/api/me', { method: 'PUT', body: d })); E.toast('Wasifu umehifadhiwa', 'ok'); profile(); }
      catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
    };
    $('#pwf').onsubmit = async (e) => {
      e.preventDefault();
      try { await E.api('/api/me/password', { body: E.formData(e.target) }); E.toast('Password imebadilishwa', 'ok'); e.target.reset(); }
      catch (err) { E.toast(err.message, 'err'); }
    };
    $('#out').onclick = logout;
  }

  // ===== Uthibitisho =====
  async function verify() {
    const main = shell('/verify');
    main.innerHTML = '<div class="empty"><span class="spin"></span></div>';
    let v;
    try { v = await E.api('/api/my/verification'); } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const lvl = v.verify_level;
    const latest = v.latest;
    const level = (n, icon, t, d) => `<div class="level ${lvl >= n ? 'done' : ''}"><div class="ic"><i class="ti ${icon}"></i></div><div><b>${t}</b><div class="small muted">${d}</div></div></div>`;
    main.innerHTML = `
      <h1>Pata beji ya Verified</h1>
      <p class="muted">Beji inaonyesha wateja kuwa umethibitishwa na 88EST. Matangazo ya waliothibitishwa yanaonekana juu zaidi.</p>
      <div class="card">
        ${level(0, 'ti-user', 'Akaunti ya kawaida', 'Umejisajili kwa simu na email')}
        ${level(1, 'ti-rosette-discount-check', 'Verified', 'Kitambulisho (NIDA) na selfie vimethibitishwa')}
        ${level(2, 'ti-building-bank', 'Kampuni iliyosajiliwa', 'Leseni ya biashara au TIN imethibitishwa')}
      </div>
      <div id="vBody" class="mt"></div>`;
    const vb = $('#vBody');
    if (latest && latest.status === 'pending') {
      vb.innerHTML = '<div class="alert alert-gold"><i class="ti ti-clock"></i><div><b>Ombi lako linashughulikiwa</b><div class="small">Timu ya 88EST itakagua taarifa zako na kukujulisha.</div></div></div>';
      return;
    }
    if (lvl >= 2) {
      vb.innerHTML = '<div class="alert alert-dark"><i class="ti ti-rosette-discount-check gold"></i><div><b>Umefikia ngazi ya juu kabisa</b><div class="small" style="opacity:.85">Asante kwa kuwa muuzaji aliyethibitishwa.</div></div></div>';
      return;
    }
    const imgs = { id_image: null, selfie_image: null, license_image: null };
    vb.innerHTML = `
      ${latest && latest.status === 'rejected' ? `<div class="alert alert-red"><i class="ti ti-alert-triangle"></i><div><b>Ombi la awali lilikataliwa</b><div class="small">${esc(latest.note || '')}</div></div></div>` : ''}
      ${!v.pro ? `<div class="alert alert-gold"><i class="ti ti-crown"></i><div class="small">Beji ya Verified ni sehemu ya <b>kifurushi cha Pro</b>. Unaweza kutuma taarifa sasa; beji itawashwa ukishalipia Pro na kupita ukaguzi. <a href="#/pro" style="text-decoration:underline">Angalia Pro</a></div></div>` : ''}
      <form id="vf" class="form-sec">
        <h3>Tuma taarifa za uthibitisho</h3>
        <div class="field"><label>Namba ya NIDA *</label><input class="input" name="nida" inputmode="numeric" placeholder="Tarakimu 20" required></div>
        <div class="field"><label>Picha ya kitambulisho (NIDA) *</label><div class="upl" data-k="id_image"><i class="ti ti-id"></i><span class="small">Gusa kupiga au kuchagua picha</span></div></div>
        <div class="field"><label>Selfie yako ukiwa umeshika kitambulisho *</label><div class="upl" data-k="selfie_image"><i class="ti ti-camera-selfie"></i><span class="small">Gusa kupiga selfie</span></div></div>
        <div class="field"><label>Leseni ya biashara (kwa kampuni)</label><div class="upl" data-k="license_image"><i class="ti ti-file-certificate"></i><span class="small">Si lazima. Inakupa ngazi ya "Kampuni iliyosajiliwa"</span></div></div>
        <div class="field"><label>Namba ya TIN</label><input class="input" name="tin" placeholder="Si lazima"></div>
        <p class="tiny muted"><i class="ti ti-lock"></i> Taarifa hizi zinahifadhiwa kwa usalama na kuonwa na admin wa 88EST tu, kwa mujibu wa Sheria ya Ulinzi wa Taarifa Binafsi.</p>
        <button class="btn btn-gold btn-block" id="vSend">Tuma kwa ukaguzi</button>
        <input type="file" id="vIn" accept="image/*" hidden>
      </form>`;
    let curK = null;
    vb.querySelectorAll('.upl').forEach((el) => { el.onclick = () => { curK = el.dataset.k; $('#vIn').click(); }; });
    $('#vIn').onchange = async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f || !curK) return;
      const el = vb.querySelector(`.upl[data-k="${curK}"]`);
      const k = curK;
      el.innerHTML = '<span class="spin"></span><span class="small">Inapakia...</span>';
      try {
        imgs[k] = await E.upload(f, true);
        el.innerHTML = `<img src="${E.img(imgs[k], E.token())}"><span class="small"><i class="ti ti-check gold"></i> Imepakiwa. Gusa kubadilisha</span>`;
      } catch (err) { el.innerHTML = '<i class="ti ti-alert-circle"></i><span class="small">Imeshindwa. Gusa kujaribu tena</span>'; E.toast(err.message, 'err'); }
    };
    $('#vf').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#vSend');
      E.busy(btn, true);
      try {
        await E.api('/api/my/verification', { body: { ...E.formData(e.target), ...imgs } });
        await loadMe();
        E.toast('Ombi limetumwa', 'ok');
        verify();
      } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
    };
  }

  // ===== Pro =====
  async function pro() {
    const main = shell('/pro');
    main.innerHTML = '<div class="empty"><span class="spin"></span></div>';
    let cfg, reqs;
    try {
      [cfg, reqs] = await Promise.all([E.api('/api/config'), E.api('/api/my/pro-requests')]);
    } catch (e) { main.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const u = S.me;
    const pending = reqs.items.find((r) => r.status === 'pending');
    const price = cfg.pro_price_month;
    main.innerHTML = `
      <h1>88EST Pro</h1>
      <p class="muted">Kuonekana zaidi, wateja zaidi.</p>
      ${u.pro ? `<div class="alert alert-dark"><i class="ti ti-crown gold"></i><div><b>Uko kwenye Pro</b><div class="small" style="opacity:.85">Mpaka ${E.date(u.pro_until)}. Unaweza kuongeza muda wakati wowote.</div></div></div>` : ''}
      <div class="plan-card">
        <div class="row between"><h2 style="margin:0">Pro</h2><div><b style="font-size:20px">${E.money(price)}</b><span class="muted small"> / mwezi</span></div></div>
        <ul>
          <li><i class="ti ti-rosette-discount-check"></i> Beji ya Verified (baada ya ukaguzi wa kitambulisho)</li>
          <li><i class="ti ti-trending-up"></i> Matangazo yako yanaonekana juu kwenye matokeo</li>
          <li><i class="ti ti-stack-2"></i> Matangazo mpaka ${cfg.pro_limit} (bure ni ${cfg.free_limit})</li>
          <li><i class="ti ti-chart-bar"></i> Takwimu za walioona na waliopiga simu</li>
          <li><i class="ti ti-crown"></i> Alama ya PRO kwenye ukurasa wako</li>
        </ul>
        <p class="small muted" style="margin:0">Tangazo maalum (juu kabisa ya ukurasa wa mwanzo): ${E.money(cfg.featured_price_week)} kwa wiki. Wasiliana nasi.</p>
      </div>
      <div class="form-sec mt" id="payBox"></div>
      ${reqs.items.length ? `<div class="form-sec"><h3>Maombi yako</h3>${reqs.items.map((r) => `<div class="kv" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line);font-size:14px"><span>Miezi ${r.months} · ${E.money(r.amount)}<br><span class="tiny muted">${E.date(r.created_at)} · Ref: ${esc(r.reference)}</span></span><span class="badge ${{ pending: 'st-pending', approved: 'st-approved', rejected: 'st-rejected' }[r.status]}">${{ pending: 'Inasubiri', approved: 'Imekubaliwa', rejected: 'Imekataliwa' }[r.status]}</span></div>`).join('')}</div>` : ''}`;
    const pay = $('#payBox');
    if (pending) {
      pay.innerHTML = '<div class="alert alert-gold" style="margin:0"><i class="ti ti-clock"></i><div><b>Malipo yako yanathibitishwa</b><div class="small">Pro itawashwa mara timu ya 88EST ikithibitisha malipo.</div></div></div>';
      return;
    }
    pay.innerHTML = `
      <h3>Jinsi ya kulipia</h3>
      <p class="small" style="white-space:pre-line">${esc(cfg.pay_instructions)}</p>
      <a class="btn btn-wa btn-sm" href="https://wa.me/${esc(cfg.support_phone)}?text=${encodeURIComponent('Habari 88EST, nataka kujiunga na Pro. Akaunti: ' + E.phoneLocal(u.phone))}" target="_blank"><i class="ti ti-brand-whatsapp"></i> Wasiliana nasi WhatsApp</a>
      <form id="prf" class="mt">
        <div class="field"><label>Muda</label><div class="seg">${[1, 3, 6, 12].map((m, i) => `<label><input type="radio" name="months" value="${m}" ${i === 0 ? 'checked' : ''}><span>Miezi ${m}</span></label>`).join('')}</div>
          <div class="hint" id="total">Jumla: ${E.money(price)}</div></div>
        <div class="field"><label>Namba ya muamala (reference) *</label><input class="input" name="reference" placeholder="Mfano: QK71HX2B9P" required></div>
        <button class="btn btn-gold btn-block">Nimelipa, thibitisha</button>
      </form>`;
    const f = $('#prf');
    f.onchange = () => { $('#total').textContent = 'Jumla: ' + E.money(price * Number(E.formData(f).months)); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button');
      E.busy(btn, true);
      try { await E.api('/api/my/pro-requests', { body: E.formData(f) }); E.toast('Ombi limetumwa', 'ok'); pro(); }
      catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
    };
  }

  // ===== Router =====
  async function route() {
    const h = (location.hash.replace(/^#/, '') || '/').split('?')[0];
    if (h === '/login' || h === '/register') {
      if (S.me || (await loadMe())) { location.hash = '#/'; return; }
      return authPage(h.slice(1));
    }
    if (!S.me && !(await loadMe())) {
      if (h !== '/') sessionStorage.setItem('est_after', '#' + h);
      location.hash = h === '/new' ? '#/register' : '#/login';
      return;
    }
    window.scrollTo(0, 0);
    E.closeModal();
    const m = h.match(/^\/edit\/(\d+)/);
    if (m) return listingForm(m[1]);
    if (h === '/listings') return myListings();
    if (h === '/new') return listingForm(null);
    if (h === '/profile') return profile();
    if (h === '/verify') return verify();
    if (h === '/pro') return pro();
    return dashboard();
  }
  window.addEventListener('hashchange', route);
  route();
})();
