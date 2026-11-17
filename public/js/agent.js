// Msaidizi wa 88EST - dirisha la mazungumzo kwa wateja
(function () {
  const esc = E.esc;
  const KEY = 'est_agent';
  let st;
  try { st = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
  if (!st) st = { msgs: [], ctx: {}, session: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ ...st, msgs: st.msgs.slice(-30) })); } catch (e) { /* hakuna */ } };

  const WELCOME = {
    role: 'bot',
    text: 'Habari! Mimi ni msaidizi wa 88EST. Niambie unatafuta nini, nitakuonyesha mali zinazofaa.',
    chips: ['Nyumba ya kupanga Dar chini ya 500k', 'Kiwanja Kigamboni', 'Short stay Arusha', 'Nawezaje kuweka tangazo?'],
  };

  const fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.setAttribute('aria-label', 'Msaidizi wa 88EST');
  fab.innerHTML = '<i class="ti ti-message-chatbot"></i><span class="chat-fab-t">Msaidizi</span>';
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.className = 'chat-panel glass';
  panel.innerHTML = `
    <div class="chat-head">
      <div class="chat-av"><i class="ti ti-sparkles"></i></div>
      <div class="grow"><b>Msaidizi wa 88EST</b><div class="tiny muted">Anakusaidia kupata mali haraka</div></div>
      <button class="chat-x" data-chat-reset aria-label="Anza upya" title="Anza upya"><i class="ti ti-refresh"></i></button>
      <button class="chat-x" data-chat-close aria-label="Funga"><i class="ti ti-x"></i></button>
    </div>
    <div class="chat-body" id="chatBody"></div>
    <form class="chat-in" id="chatForm">
      <input id="chatText" autocomplete="off" maxlength="500" placeholder="Mf. Nyumba vyumba 3 Mbezi, bajeti 800k">
      <button class="go sm" aria-label="Tuma"><i class="ti ti-send"></i></button>
    </form>`;
  document.body.appendChild(panel);
  const body = panel.querySelector('#chatBody');
  const input = panel.querySelector('#chatText');

  function card(l) {
    return `<div class="chat-card" data-l="${l.id}">
      <img src="${E.img(l.photo)}" alt="" loading="lazy">
      <div class="cc-b"><div class="cc-t">${esc(l.title)}</div>
      <div class="cc-p notranslate" translate="no">${l.price ? E.moneyShort(l.price) : 'Maelewano'}<small>${E.per(l.price_period)}</small></div>
      <div class="cc-l"><i class="ti ti-map-pin"></i>${esc([l.ward, l.district].filter(Boolean).join(', '))}</div></div>
    </div>`;
  }
  const qs = (o) => Object.entries(o || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

  function render() {
    const all = [WELCOME].concat(st.msgs);
    body.innerHTML = all.map((m, i) => {
      if (m.role === 'user') return `<div class="bubble me">${esc(m.text)}</div>`;
      const last = i === all.length - 1;
      return `<div class="bubble bot">${esc(m.text)}
        ${m.link ? `<a class="chat-link" href="${esc(m.link.url)}" ${m.link.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(m.link.label)} <i class="ti ti-arrow-right"></i></a>` : ''}
      </div>
      ${m.listings && m.listings.length ? `<div class="chat-cards">${m.listings.map(card).join('')}</div>` : ''}
      ${m.more ? `<a class="chat-link" style="margin:0 0 8px 6px" href="#/s?${qs(m.more)}" data-chat-go>Ona matangazo yote <i class="ti ti-arrow-right"></i></a>` : ''}
      ${last && m.chips && m.chips.length ? `<div class="chat-chips">${m.chips.map((c) => `<button type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}`;
    }).join('') + (st.busy ? '<div class="bubble bot typing"><span></span><span></span><span></span></div>' : '');
    body.scrollTop = body.scrollHeight;
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || st.busy) return;
    st.msgs.push({ role: 'user', text });
    st.busy = true;
    render();
    try {
      const history = st.msgs.slice(-7, -1).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
      const r = await E.api('/api/agent/chat', { body: { message: text, history, ctx: st.ctx, session: st.session }, token: '' });
      st.ctx = r.ctx || st.ctx;
      st.msgs.push({ role: 'bot', text: r.reply, listings: r.listings, chips: r.chips, link: r.link, more: r.more });
    } catch (e) {
      st.msgs.push({ role: 'bot', text: e.message || 'Kuna tatizo la mtandao. Jaribu tena.' });
    }
    st.busy = false;
    save();
    render();
  }

  function open() {
    panel.classList.add('open');
    fab.classList.add('hide-fab');
    render();
    if (window.innerWidth >= 900) setTimeout(() => input.focus(), 200);
  }
  function close() {
    panel.classList.remove('open');
    fab.classList.remove('hide-fab');
  }

  fab.onclick = open;
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-chat-close]')) return close();
    if (e.target.closest('[data-chat-reset]')) { st.msgs = []; st.ctx = {}; save(); return render(); }
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      // Vitufe vinavyochuja vinaongezwa kwenye utafutaji uliopita
      return send(chip.dataset.chip);
    }
    if (e.target.closest('[data-l]') || e.target.closest('[data-chat-go]')) {
      if (window.innerWidth < 900) close();
    }
  });
  panel.querySelector('#chatForm').onsubmit = (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    send(v);
  };
  window.EstAgent = { open, close };
})();
