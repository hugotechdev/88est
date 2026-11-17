// 88EST - Mchoro wa viwanja (site plan): kionyeshi cha mteja na zana ya kuchora ya muuzaji
(function () {
  const esc = E.esc;
  const ST = {
    available: ['Kinapatikana', 'sp-av'],
    reserved: ['Kimeshikiliwa', 'sp-rs'],
    sold: ['Kimeuzwa', 'sp-sd'],
  };
  const ZOOMS = [1, 1.5, 2, 3, 4, 6];

  function center(pts) {
    let x = 0; let y = 0;
    pts.forEach((p) => { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }
  function bbox(pts) {
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  const H = (plan) => Math.round((1000 * (plan.h || 1000)) / (plan.w || 1000));
  const ptsAttr = (pts, h) => pts.map((p) => (p[0] * 1000).toFixed(1) + ',' + (p[1] * h).toFixed(1)).join(' ');
  const money = (n) => (n ? E.moneyShort(n) : '—');

  // Polygons na namba juu ya picha
  function shapes(plan, plots, sel, onlyAv) {
    const h = H(plan);
    return plots.map((p, i) => {
      const c = center(p.points);
      const b = bbox(p.points);
      const fs = Math.max(6, Math.min(26, Math.min(b.w * 1000, b.h * h) * 0.38));
      const cls = (ST[p.status] || ST.available)[1] + (sel.has(i) ? ' sp-sel' : '') + (onlyAv && p.status !== 'available' ? ' sp-dim' : '');
      return `<g data-i="${i}" class="sp-p ${cls}"><polygon points="${ptsAttr(p.points, h)}"/>
        <text x="${(c[0] * 1000).toFixed(1)}" y="${(c[1] * h).toFixed(1)}" font-size="${fs.toFixed(1)}">${esc(p.number)}</text></g>`;
    }).join('');
  }

  function zoomer(view, inner, getZ, setZ) {
    return (dir) => {
      const i = ZOOMS.indexOf(getZ());
      const nz = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))];
      const cx = (view.scrollLeft + view.clientWidth / 2) / inner.offsetWidth;
      const cy = (view.scrollTop + view.clientHeight / 2) / inner.offsetHeight;
      setZ(nz);
      inner.style.width = nz * 100 + '%';
      view.scrollLeft = cx * inner.offsetWidth - view.clientWidth / 2;
      view.scrollTop = cy * inner.offsetHeight - view.clientHeight / 2;
    };
  }

  // ===================== KIONYESHI CHA MTEJA =====================
  function viewer(root, data, opts = {}) {
    const plan = data.siteplan;
    const plots = data.plots || [];
    const sel = new Set();
    let onlyAv = false;
    let zoom = 1;
    const counts = { available: 0, reserved: 0, sold: 0 };
    plots.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    const h = H(plan);

    root.innerHTML = `
      <div class="sp">
        <div class="sp-legend">
          <span class="sp-key sp-av">Vinapatikana ${counts.available}</span>
          <span class="sp-key sp-rs">Vimeshikiliwa ${counts.reserved}</span>
          <span class="sp-key sp-sd">Vimeuzwa ${counts.sold}</span>
        </div>
        <div class="sp-bar">
          <label class="sp-tg"><input type="checkbox" data-only> Vinavyopatikana tu</label>
          <span class="grow"></span>
          <button type="button" class="sp-btn" data-z="-1" aria-label="Punguza"><i class="ti ti-minus"></i></button>
          <button type="button" class="sp-btn" data-z="1" aria-label="Kuza"><i class="ti ti-plus"></i></button>
          <button type="button" class="sp-btn" data-list aria-label="Orodha"><i class="ti ti-list"></i></button>
        </div>
        <div class="sp-view"><div class="sp-inner">
          <img src="${E.img(plan.image)}" alt="Mchoro wa viwanja" draggable="false">
          <svg viewBox="0 0 1000 ${h}" preserveAspectRatio="none"></svg>
        </div></div>
        <p class="tiny muted" style="margin:6px 2px 0">Gusa kiwanja kinachopatikana kukichagua. Tumia + kukuza mchoro.</p>
        <div class="sp-info"></div>
        <div class="sp-table hide"></div>
      </div>`;
    const view = root.querySelector('.sp-view');
    const inner = root.querySelector('.sp-inner');
    const svg = root.querySelector('svg');
    const info = root.querySelector('.sp-info');
    const table = root.querySelector('.sp-table');

    const draw = () => { svg.innerHTML = shapes(plan, plots, sel, onlyAv); };
    const renderInfo = (last) => {
      const chosen = [...sel].map((i) => plots[i]);
      const total = chosen.reduce((a, p) => a + (p.price || 0), 0);
      let html = '';
      if (last != null) {
        const p = plots[last];
        html += `<div class="sp-card"><b>Kiwanja ${esc(p.number)}</b> <span class="badge ${ST[p.status][1]}">${ST[p.status][0]}</span>
          <div class="small">${p.size ? Number(p.size).toLocaleString('en-US') + ' ' + esc(opts.unit || 'sqm') + ' · ' : ''}${p.price ? E.money(p.price) : 'Bei: uliza'}</div></div>`;
      }
      if (chosen.length) {
        html += `<div class="sp-chosen"><div class="small"><b>Umechagua ${chosen.length}:</b> ${chosen.map((p) => esc(p.number)).join(', ')}${total ? ' · Jumla ' + E.money(total) : ''}</div>
          <button type="button" class="btn btn-ghost btn-sm" data-clear>Futa chaguo</button></div>`;
      }
      info.innerHTML = html;
      if (opts.onChange) opts.onChange(chosen);
    };
    const renderTable = () => {
      table.innerHTML = `<table class="a-table sp-tbl"><thead><tr><th></th><th>Namba</th><th>Ukubwa</th><th>Bei</th><th>Hali</th></tr></thead><tbody>
        ${plots.map((p, i) => (onlyAv && p.status !== 'available') ? '' : `<tr data-row="${i}" class="${sel.has(i) ? 'on' : ''}">
          <td>${p.status === 'available' ? `<input type="checkbox" ${sel.has(i) ? 'checked' : ''}>` : ''}</td><td><b>${esc(p.number)}</b></td>
          <td>${p.size ? Number(p.size).toLocaleString('en-US') : '—'}</td><td>${money(p.price)}</td><td><span class="badge ${ST[p.status][1]}">${ST[p.status][0]}</span></td></tr>`).join('')}
      </tbody></table>`;
    };
    const toggle = (i) => {
      const p = plots[i];
      if (p.status !== 'available') { renderInfo(i); return; }
      if (sel.has(i)) sel.delete(i); else sel.add(i);
      draw();
      renderInfo(i);
      if (!table.classList.contains('hide')) renderTable();
    };

    svg.addEventListener('click', (e) => { const g = e.target.closest('[data-i]'); if (g) toggle(Number(g.dataset.i)); });
    table.addEventListener('click', (e) => { const r = e.target.closest('[data-row]'); if (r) toggle(Number(r.dataset.row)); });
    const z = zoomer(view, inner, () => zoom, (v) => { zoom = v; });
    root.querySelector('.sp-bar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]');
      if (b) z(Number(b.dataset.z));
      if (e.target.closest('[data-list]')) { table.classList.toggle('hide'); if (!table.classList.contains('hide')) renderTable(); }
    });
    root.querySelector('[data-only]').addEventListener('change', (e) => { onlyAv = e.target.checked; draw(); if (!table.classList.contains('hide')) renderTable(); });
    info.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) { sel.clear(); draw(); renderInfo(null); if (!table.classList.contains('hide')) renderTable(); } });
    draw();
    renderInfo(null);
    return { selected: () => [...sel].map((i) => plots[i]) };
  }

  // ===================== ZANA YA MUUZAJI =====================
  function editor(root, data, opts = {}) {
    let plan = data.siteplan || null;
    let plots = (data.plots || []).map((p) => ({ number: p.number, size: p.size, price: p.price, status: p.status, points: p.points }));
    let mode = 'select';
    let zoom = 1;
    let pts = [];
    let cur = -1;
    let dirty = false;
    let last = { size: null, price: null };
    const unit = opts.unit || 'sqm';

    const nextNumber = () => {
      let max = 0;
      plots.forEach((p) => { const m = String(p.number).match(/(\d+)\s*$/); if (m) max = Math.max(max, Number(m[1])); });
      return String(max + 1);
    };
    const mark = () => { dirty = true; const s = root.querySelector('.sp-save'); if (s) s.classList.add('sp-dirty'); };

    function shell() {
      if (!plan) {
        root.innerHTML = `<div class="upl sp-upload" style="padding:30px;justify-content:center;flex-direction:column;text-align:center">
          <i class="ti ti-map-2" style="font-size:40px"></i><b>Pakia picha ya mchoro (survey plan)</b>
          <span class="small muted">JPG au PNG. Ukiwa na PDF, piga picha ya skrini au ibadilishe kuwa JPG kwanza.</span></div>
          <input type="file" accept="image/*" hidden class="sp-file">`;
        root.querySelector('.sp-upload').onclick = () => root.querySelector('.sp-file').click();
        root.querySelector('.sp-file').onchange = (e) => uploadPlan(e.target.files[0]);
        return;
      }
      const h = H(plan);
      root.innerHTML = `
        <div class="sp sp-ed">
          <div class="sp-modes">
            <button type="button" data-mode="select"><i class="ti ti-pointer"></i> Chagua</button>
            <button type="button" data-mode="draw"><i class="ti ti-polygon"></i> Chora kiwanja</button>
            <button type="button" data-mode="grid"><i class="ti ti-layout-grid"></i> Gawa kwa gridi</button>
          </div>
          <div class="sp-hint small"></div>
          <div class="sp-bar">
            <button type="button" class="sp-btn hide" data-undo><i class="ti ti-arrow-back-up"></i> Tendua</button>
            <button type="button" class="btn btn-gold btn-sm hide" data-finish><i class="ti ti-check"></i> Maliza kiwanja</button>
            <span class="grow"></span>
            <button type="button" class="sp-btn" data-z="-1"><i class="ti ti-minus"></i></button>
            <button type="button" class="sp-btn" data-z="1"><i class="ti ti-plus"></i></button>
          </div>
          <div class="sp-view sp-edit-view"><div class="sp-inner" style="width:${zoom * 100}%">
            <img src="${E.img(plan.image)}" alt="" draggable="false">
            <svg viewBox="0 0 1000 ${h}" preserveAspectRatio="none"></svg>
          </div></div>
          <div class="sp-form"></div>
          <div class="row between wrap gap mt">
            <div class="small muted"><b class="sp-count"></b></div>
            <div class="row gap"><button type="button" class="btn btn-ghost btn-sm" data-replace><i class="ti ti-photo"></i> Badilisha picha</button>
              <button type="button" class="btn btn-ghost btn-sm" data-bulk><i class="ti ti-adjustments"></i> Bei/ukubwa kwa vyote</button></div>
          </div>
          <div class="sp-table"></div>
          <div class="sticky-save"><button type="button" class="btn btn-gold btn-block sp-save"><i class="ti ti-device-floppy"></i> Hifadhi mchoro</button></div>
          <input type="file" accept="image/*" hidden class="sp-file">
        </div>`;
      const view = root.querySelector('.sp-view');
      const inner = root.querySelector('.sp-inner');
      const svg = root.querySelector('svg');
      const z = zoomer(view, inner, () => zoom, (v) => { zoom = v; });

      root.querySelector('.sp-modes').onclick = (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); };
      root.querySelector('.sp-bar').onclick = (e) => {
        const b = e.target.closest('[data-z]');
        if (b) return z(Number(b.dataset.z));
        if (e.target.closest('[data-undo]')) { pts.pop(); draw(); }
        if (e.target.closest('[data-finish]')) finishPlot();
      };
      svg.addEventListener('click', (e) => {
        if (mode === 'select') {
          const g = e.target.closest('[data-i]');
          cur = g ? Number(g.dataset.i) : -1;
          draw(); form();
          return;
        }
        const r = svg.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        pts.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
        if (mode === 'grid' && pts.length === 4) { draw(); return gridModal(); }
        draw();
      });
      root.querySelector('[data-replace]').onclick = () => root.querySelector('.sp-file').click();
      root.querySelector('.sp-file').onchange = (e) => uploadPlan(e.target.files[0]);
      root.querySelector('[data-bulk]').onclick = bulkModal;
      root.querySelector('.sp-save').onclick = save;
      root.querySelector('.sp-table').addEventListener('change', (e) => {
        const s = e.target.closest('[data-st]');
        if (s) { plots[Number(s.dataset.st)].status = s.value; mark(); draw(); }
      });
      root.querySelector('.sp-table').addEventListener('click', (e) => {
        const d = e.target.closest('[data-del]');
        if (d) { plots.splice(Number(d.dataset.del), 1); cur = -1; mark(); refresh(); return; }
        const r = e.target.closest('[data-row]');
        if (r && !e.target.closest('select')) { cur = Number(r.dataset.row); setMode('select'); }
      });
      setMode(mode);
      if (dirty) mark();
    }

    function setMode(m) {
      mode = m;
      pts = [];
      root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
      const hints = {
        select: 'Gusa kiwanja kukihariri. Badilisha hali (kinapatikana, kimeshikiliwa, kimeuzwa) kwenye orodha chini.',
        draw: 'Gusa pembe za kiwanja kimoja kwa mpangilio (angalau 3), kisha bonyeza "Maliza kiwanja".',
        grid: 'Kwa block yenye viwanja vilivyopangika: gusa pembe 4 za block kwa mpangilio: juu-kushoto, juu-kulia, chini-kulia, chini-kushoto.',
      };
      root.querySelector('.sp-hint').textContent = hints[m];
      root.querySelector('[data-undo]').classList.toggle('hide', m === 'select');
      root.querySelector('[data-finish]').classList.toggle('hide', m !== 'draw');
      root.querySelector('.sp-view').classList.toggle('sp-cross', m !== 'select');
      refresh();
    }

    function draw() {
      const svg = root.querySelector('svg');
      if (!svg) return;
      const h = H(plan);
      const sel = new Set(cur >= 0 ? [cur] : []);
      let extra = '';
      if (pts.length) {
        extra += `<polyline class="sp-draft" points="${ptsAttr(pts, h)}${mode === 'grid' && pts.length === 4 ? ' ' + ptsAttr([pts[0]], h) : ''}"/>`;
        extra += pts.map((p, i) => `<circle class="sp-dot" cx="${p[0] * 1000}" cy="${p[1] * h}" r="6"/>${mode === 'grid' ? `<text class="sp-dot-t" x="${p[0] * 1000 + 9}" y="${p[1] * h - 9}" font-size="16">${i + 1}</text>` : ''}`).join('');
      }
      svg.innerHTML = shapes(plan, plots, sel, false) + extra;
      const c = root.querySelector('.sp-count');
      if (c) {
        const av = plots.filter((p) => p.status === 'available').length;
        c.textContent = `Viwanja ${plots.length} · vinapatikana ${av}`;
      }
    }

    function table() {
      const t = root.querySelector('.sp-table');
      if (!t) return;
      t.innerHTML = plots.length ? `<table class="a-table sp-tbl"><thead><tr><th>Namba</th><th>Ukubwa (${esc(unit)})</th><th>Bei</th><th>Hali</th><th></th></tr></thead><tbody>
        ${plots.map((p, i) => `<tr data-row="${i}" class="${i === cur ? 'on' : ''}"><td><b>${esc(p.number)}</b></td><td>${p.size ? Number(p.size).toLocaleString('en-US') : '—'}</td><td>${money(p.price)}</td>
          <td><select class="input sp-st" data-st="${i}">${Object.entries(ST).map(([k, [t2]]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${t2}</option>`).join('')}</select></td>
          <td><button type="button" class="btn btn-danger btn-sm" data-del="${i}" aria-label="Futa"><i class="ti ti-trash"></i></button></td></tr>`).join('')}
        </tbody></table>` : '<p class="small muted">Bado hujachora kiwanja. Chagua "Chora kiwanja" au "Gawa kwa gridi".</p>';
    }

    function form() {
      const f = root.querySelector('.sp-form');
      if (!f) return;
      if (cur < 0 || !plots[cur]) { f.innerHTML = ''; return; }
      const p = plots[cur];
      f.innerHTML = `<div class="card mt" style="background:var(--off)"><div class="row between"><b>Kiwanja ${esc(p.number)}</b><button type="button" class="btn btn-danger btn-sm" data-fdel><i class="ti ti-trash"></i> Futa</button></div>
        <div class="grid2 mt-s"><div class="field"><label>Namba</label><input class="input" data-f="number" value="${esc(p.number)}"></div>
        <div class="field"><label>Hali</label><select class="input" data-f="status">${Object.entries(ST).map(([k, [t]]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
        <div class="grid2"><div class="field"><label>Ukubwa (${esc(unit)})</label><input class="input" data-f="size" inputmode="decimal" value="${p.size ?? ''}"></div>
        <div class="field"><label>Bei (TZS)</label><input class="input" data-f="price" inputmode="numeric" value="${p.price ? Number(p.price).toLocaleString('en-US') : ''}"></div></div></div>`;
      f.querySelectorAll('[data-f]').forEach((el) => el.addEventListener('change', () => {
        const k = el.dataset.f;
        let v = el.value.trim();
        if (k === 'price') v = v.replace(/[^\d]/g, '') ? Number(v.replace(/[^\d]/g, '')) : null;
        if (k === 'size') v = v ? Number(v) : null;
        if (k === 'number' && !v) return;
        p[k] = v;
        mark(); draw(); table();
      }));
      f.querySelector('[data-fdel]').onclick = () => { plots.splice(cur, 1); cur = -1; mark(); refresh(); };
    }

    function refresh() { draw(); table(); form(); }

    function finishPlot() {
      if (pts.length < 3) return E.toast('Gusa angalau pembe 3 za kiwanja', 'err');
      const shape = pts.slice();
      const m = E.modal(`<h3>Kiwanja kipya</h3>
        <div class="grid2"><div class="field"><label>Namba</label><input class="input" id="nN" value="${esc(nextNumber())}"></div>
        <div class="field"><label>Ukubwa (${esc(unit)})</label><input class="input" id="nS" inputmode="decimal" value="${last.size ?? ''}"></div></div>
        <div class="field"><label>Bei (TZS)</label><input class="input" id="nP" inputmode="numeric" value="${last.price ? Number(last.price).toLocaleString('en-US') : ''}"></div>
        <button class="btn btn-gold btn-block" id="nOk">Ongeza</button>`);
      m.querySelector('#nOk').onclick = () => {
        const number = m.querySelector('#nN').value.trim();
        if (!number) return E.toast('Weka namba ya kiwanja', 'err');
        if (plots.some((p) => String(p.number).toLowerCase() === number.toLowerCase())) return E.toast('Namba hii tayari ipo', 'err');
        const size = m.querySelector('#nS').value ? Number(m.querySelector('#nS').value) : null;
        const pr = m.querySelector('#nP').value.replace(/[^\d]/g, '');
        const price = pr ? Number(pr) : null;
        last = { size, price };
        plots.push({ number, size, price, status: 'available', points: shape });
        pts = [];
        E.closeModal();
        mark(); refresh();
      };
    }

    function gridModal() {
      const c = pts.slice();
      const m = E.modal(`<h3>Gawa block kwa gridi</h3>
        <div class="grid2"><div class="field"><label>Safu (mistari)</label><input class="input" id="gR" inputmode="numeric" value="2"></div>
        <div class="field"><label>Viwanja kwa kila safu</label><input class="input" id="gC" inputmode="numeric" value="5"></div></div>
        <div class="grid2"><div class="field"><label>Namba ya kuanzia</label><input class="input" id="gS" inputmode="numeric" value="${esc(nextNumber())}"></div>
        <div class="field"><label>Herufi mbele ya namba</label><input class="input" id="gX" placeholder="Mf. A- (si lazima)"></div></div>
        <div class="grid2"><div class="field"><label>Ukubwa wa kila kimoja (${esc(unit)})</label><input class="input" id="gZ" inputmode="decimal" value="${last.size ?? ''}"></div>
        <div class="field"><label>Bei ya kila kimoja (TZS)</label><input class="input" id="gP" inputmode="numeric" value="${last.price ? Number(last.price).toLocaleString('en-US') : ''}"></div></div>
        <button class="btn btn-gold btn-block" id="gOk">Tengeneza viwanja</button>`);
      m.parentElement.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === m.parentElement) { pts = []; draw(); } });
      m.querySelector('#gOk').onclick = () => {
        const rows = Math.min(50, Math.max(1, parseInt(m.querySelector('#gR').value, 10) || 0));
        const cols = Math.min(100, Math.max(1, parseInt(m.querySelector('#gC').value, 10) || 0));
        const start = parseInt(m.querySelector('#gS').value, 10) || 1;
        const pre = m.querySelector('#gX').value.trim();
        const size = m.querySelector('#gZ').value ? Number(m.querySelector('#gZ').value) : null;
        const pr = m.querySelector('#gP').value.replace(/[^\d]/g, '');
        const price = pr ? Number(pr) : null;
        // Pembe: A juu-kushoto, B juu-kulia, C chini-kulia, D chini-kushoto
        const [A, B, C, D] = c;
        const P = (u, v) => [
          (1 - v) * ((1 - u) * A[0] + u * B[0]) + v * ((1 - u) * D[0] + u * C[0]),
          (1 - v) * ((1 - u) * A[1] + u * B[1]) + v * ((1 - u) * D[1] + u * C[1]),
        ];
        const existing = new Set(plots.map((p) => String(p.number).toLowerCase()));
        let n = start;
        let skipped = 0;
        for (let r = 0; r < rows; r++) {
          for (let k = 0; k < cols; k++) {
            const u0 = k / cols; const u1 = (k + 1) / cols; const v0 = r / rows; const v1 = (r + 1) / rows;
            const number = pre + n;
            n += 1;
            if (existing.has(number.toLowerCase())) { skipped += 1; continue; }
            plots.push({ number, size, price, status: 'available', points: [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)] });
          }
        }
        last = { size, price };
        pts = [];
        E.closeModal();
        mark(); refresh();
        E.toast(`Viwanja ${rows * cols - skipped} vimeongezwa${skipped ? ` (${skipped} vilikuwepo)` : ''}`, 'ok');
      };
    }

    function bulkModal() {
      if (!plots.length) return;
      const m = E.modal(`<h3>Weka ukubwa/bei kwa viwanja vyote</h3><p class="small muted">Acha wazi usichotaka kubadilisha.</p>
        <div class="grid2"><div class="field"><label>Ukubwa (${esc(unit)})</label><input class="input" id="bS" inputmode="decimal"></div>
        <div class="field"><label>Bei (TZS)</label><input class="input" id="bP" inputmode="numeric"></div></div>
        <label class="check"><input type="checkbox" id="bE"> Vile visivyo na bei/ukubwa tu</label>
        <button class="btn btn-gold btn-block mt" id="bOk">Weka</button>`);
      m.querySelector('#bOk').onclick = () => {
        const s = m.querySelector('#bS').value ? Number(m.querySelector('#bS').value) : null;
        const pr = m.querySelector('#bP').value.replace(/[^\d]/g, '');
        const price = pr ? Number(pr) : null;
        const onlyEmpty = m.querySelector('#bE').checked;
        plots.forEach((p) => {
          if (s != null && (!onlyEmpty || !p.size)) p.size = s;
          if (price != null && (!onlyEmpty || !p.price)) p.price = price;
        });
        E.closeModal();
        mark(); refresh();
      };
    }

    async function uploadPlan(file) {
      if (!file) return;
      E.toast('Inapakia mchoro...');
      try {
        const data = await E.compressImage(file, 2600, 0.86);
        const dims = await new Promise((resolve) => { const im = new Image(); im.onload = () => resolve([im.naturalWidth, im.naturalHeight]); im.src = data; });
        const r = await E.api('/api/upload', { body: { data, private: false } });
        if (plan && plots.length && !(await E.confirm('Viwanja vilivyochorwa vitabaki mahali pale pale kwenye picha mpya. Endelea?'))) return;
        plan = { image: r.id, w: dims[0], h: dims[1] };
        mark();
        shell();
        E.toast('Mchoro umepakiwa', 'ok');
      } catch (err) { E.toast(err.message, 'err'); }
    }

    async function save() {
      const btn = root.querySelector('.sp-save');
      E.busy(btn, true, 'Inahifadhi...');
      try {
        const r = await E.api('/api/my/listings/' + opts.listingId + '/plan', { method: 'PUT', body: { siteplan: plan, plots } });
        plan = r.siteplan;
        plots = r.plots.map((p) => ({ number: p.number, size: p.size, price: p.price, status: p.status, points: p.points }));
        dirty = false;
        E.busy(btn, false);
        btn.classList.remove('sp-dirty');
        E.toast('Mchoro umehifadhiwa', 'ok');
        refresh();
      } catch (err) { E.toast(err.message, 'err'); E.busy(btn, false); }
    }

    shell();
    window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    return { isDirty: () => dirty };
  }

  window.SitePlan = { viewer, editor };
})();
