(() => {
'use strict';
const C = Core, { fmt, NL, LAY, NODES, REQ, BUYABLES } = C;
const $ = id => document.getElementById(id);
const S = () => C.get();
const KEY = 'gut-remade-save-v2';
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const setT = (e, t) => { if (e._t !== t) { e.textContent = t; e._t = t; } };
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 3200); }
function hold(btn, fn) {                       // hold a button to keep buying (mouse, touch and pen)
  let t1, t2; const stop = () => { clearTimeout(t1); clearInterval(t2); };
  btn.addEventListener('pointerdown', e => { if (e.button > 0) return; fn(); ui(); t1 = setTimeout(() => { t2 = setInterval(() => { fn(); ui(); }, 80); }, 350); });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); ui(); } });
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

/* ---------- tabs: one per reset layer, added gradually ---------- */
let tab = 0; const P = [], TB = [], seenTab = [true];
for (let l = 0; l <= NL; l++) {
  const b = mk('button', '', l === 0 ? 'Dust' : l < NL ? LAY[l].n : 'Menu'); b.style.setProperty('--c', l && l < NL ? LAY[l].col : LAY[0].col); b.setAttribute('role', 'tab');
  b.onclick = () => { tab = l; b.classList.remove('new'); show(); ui(); }; $('tabs').appendChild(b); TB.push(b);
  const p = mk('section'); p.hidden = l !== 0; $('main').appendChild(p); P.push(p);
}
const show = () => { P.forEach((p, i) => { p.hidden = i !== tab; TB[i].classList.toggle('on', i === tab); TB[i].setAttribute('aria-selected', String(i === tab)); }); };

/* ---------- 2D upgrade trees ---------- */
const NW = 170, NH = 78, GX = 44, ROW = 92, TREES = [];
function buildTree(t) {
  const box = mk('div', 'treebox'), inner = mk('div', 'tree'), h = 8 * ROW, w = 4 * (NW + GX) - GX, col = LAY[t].col;
  inner.style.cssText = `width:${w}px;height:${h}px;--c:${col}`; box.appendChild(inner);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', w); svg.setAttribute('height', h); inner.appendChild(svg);
  const els = {}, lines = [], pos = {};
  NODES.filter(n => n.t === t).forEach(n => { const d = Math.floor(Math.log2(n.k + 1)), j = n.k + 1 - 2 ** d; pos[n.id] = [d * (NW + GX), (j + .5) * (h / 2 ** d) - NH / 2]; });
  NODES.filter(n => n.t === t).forEach(n => {
    if (n.parent) { const a = pos[n.parent], b = pos[n.id], x1 = a[0] + NW, y1 = a[1] + NH / 2, mx = (x1 + b[0]) / 2, p = document.createElementNS(svg.namespaceURI, 'path');
      p.setAttribute('d', `M${x1} ${y1}C${mx} ${y1} ${mx} ${b[1] + NH / 2} ${b[0]} ${b[1] + NH / 2}`); svg.appendChild(p); lines.push([p, n.id]); }
    const b = mk('button', 'node', `<b>${n.name}</b><small>${C.describe(n)}</small><span class="cost">${fmt(n.cost)} ${LAY[t].s === 'CD' ? 'CD' : LAY[t].s}</span>`);
    b.style.left = pos[n.id][0] + 'px'; b.style.top = pos[n.id][1] + 'px'; b.onclick = () => { if (C.buy(n.id)) ui(); }; inner.appendChild(b); els[n.id] = b;
  });
  TREES[t] = { els, lines }; return box;
}

/* ---------- panels ---------- */
const L = [];   // per-layer element refs
P[0].appendChild(mk('div', 'tools', `<button id="ba0">Buy all</button><label class="dim small" id="autoL" hidden><input type="checkbox" id="autoC"> Auto-Builder</label>`));
P[0].appendChild(buildTree(0));
for (let l = 1; l < NL; l++) {
  const c = LAY[l].col, card = mk('div', 'card', `<h2>${LAY[l].n}</h2><p class="dim small">${LAY[l].tag}</p><p>You have <b class="cur">0</b> ${LAY[l].s}. Dust ×<b class="boost">1</b></p><div class="bar"><i></i></div><p class="dim small req"></p><button class="go"></button><p class="small"><b>Milestones</b> <span class="dim">(lifetime resets)</span></p><ul class="ms">${C.MS.map(([n, d]) => `<li class="dim">${n} resets: ${d}</li>`).join('')}</ul>`);
  card.style.setProperty('--c', c);
  const en = mk('div', 'card', `<h3>${LAY[l].en}</h3><p>You have <b class="en">0</b> ${LAY[l].en} <span class="dim small">(+<span class="er">0</span>/s, grows with your ${LAY[l].s})</span></p><div class="buys"></div>`); en.style.setProperty('--c', c);
  const buys = [];
  BUYABLES.forEach(([n, d], b) => { const btn = mk('button', '', `<b>${n}</b> <span class="lv"></span><small>${d}</small><small class="cst"></small>`); hold(btn, () => C.buyBuyable(l, b)); en.querySelector('.buys').appendChild(btn); buys.push(btn); });
  const tools = mk('div', 'tools', `<b style="color:${c}">Upgrade tree</b><button class="ba">Buy all</button>`);
  card.querySelector('.go').onclick = () => { const gain = C.gainOf(l); if (C.reset(l)) { toast(`+${fmt(gain)} ${LAY[l].s}`); ui(); } };
  tools.querySelector('.ba').onclick = () => { C.buyAll(l); ui(); };
  P[l].append(card, en, tools, buildTree(l));
  L[l] = { cur: card.querySelector('.cur'), boost: card.querySelector('.boost'), bar: card.querySelector('.bar i'), req: card.querySelector('.req'), go: card.querySelector('.go'), en: en.querySelector('.en'), er: en.querySelector('.er'), buys, ba: tools.querySelector('.ba'), ms: [...card.querySelectorAll('.ms li')] };
}
$('ba0').onclick = () => { C.buyAll(0); ui(); };
$('autoC').onchange = e => { S().autoOn = e.target.checked; };

/* ---------- menu ---------- */
P[NL].innerHTML = `<div class="card"><h2>Menu</h2><p><label>Music <select id="track"></select></label></p><p><label>Volume <input type="range" id="vol" min="0" max="100" value="50"></label></p>
  <p><button id="save">Save</button> <button id="export">Export save</button> <button id="import">Import save</button> <button id="reset">Hard reset</button></p>
  <p class="dim small">Autosaves every 10 seconds. Offline progress up to 12 hours. Dust production is soft-capped above 1M per second so numbers stay readable.<br>Goal: buy every upgrade in the Galaxies tree.</p></div>`;

/* ---------- first-reset animations: one unique scene per layer, shown once ---------- */
const fx = $('fx'), fc = fx.getContext('2d'); let A = null;
const ease = x => x * x * (3 - 2 * x);
const DRAW = [null,
  (c, u, p, W, H, cx, cy, R, col) => {            // 1 Stars: dust gathers and ignites
    const k = Math.min(1, u / .55); c.fillStyle = '#9fb4ff';
    p.forEach(q => { const r = (1 - ease(k)) * R * (.25 + q.r * .75) + 8, a = q.a + k * 5 * q.s; c.globalAlpha = .8; c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2); });
    if (u > .5) { const b = (u - .5) / .5, rad = 50 + b * 170, g = c.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, '#fff'); g.addColorStop(.3, col); g.addColorStop(1, 'rgba(255,224,130,0)');
      c.globalAlpha = Math.min(1, b * 3); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad, 0, 6.283); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * .785 + b; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * b * R * .6, cy + Math.sin(a) * b * R * .6); c.stroke(); } } },
  (c, u, p, W, H, cx, cy, R) => {                 // 2 Nebulae: gas clouds bloom
    c.globalCompositeOperation = 'lighter'; const pal = ['#f48fb1', '#ce93d8', '#80cbc4', '#90caf9'];
    for (let i = 0; i < 18; i++) { const q = p[i], rad = (40 + ease(u) * R * .5) * (.5 + q.s * .5), x = cx + Math.cos(q.a) * q.r * R * .35 * u * 2, y = cy + Math.sin(q.a) * q.r * R * .3 * u * 2;
      const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, pal[i % 4] + '66'); g.addColorStop(1, pal[i % 4] + '00'); c.globalAlpha = Math.min(1, u * 3); c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 6.283); c.fill(); }
    c.globalCompositeOperation = 'source-over'; p.slice(18, 120).forEach(q => { c.globalAlpha = .7; c.fillStyle = '#fff'; c.fillRect(q.r * W, q.o * H, 1.5, 1.5); }); },
  (c, u, p, W, H, cx, cy, R, col) => {            // 3 Pulsars: sweeping beams and pulse rings
    c.strokeStyle = col; c.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const rr = ((u * 3 + i * .17) % 1) * R * .85; c.globalAlpha = (1 - rr / (R * .85)) * .7; c.beginPath(); c.arc(cx, cy, rr, 0, 6.283); c.stroke(); }
    const ang = u * u * 26; for (let s = 0; s < 2; s++) { const a = ang + s * Math.PI, ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R, g = c.createLinearGradient(cx, cy, ex, ey); g.addColorStop(0, '#fff'); g.addColorStop(.4, col); g.addColorStop(1, 'rgba(128,222,234,0)');
      c.globalAlpha = .9; c.strokeStyle = g; c.lineWidth = 16; c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 9, 0, 6.283); c.fill(); },
  (c, u, p, W, H, cx, cy, R, col) => {            // 4 Black Holes: everything falls in
    const k = ease(Math.min(1, u * 1.1)); c.fillStyle = '#d1c4e9';
    p.forEach(q => { const r = (1 - k) * R * (.2 + q.r * .8) + 30, a = q.a + (1 - r / R) * 12 * q.s; c.globalAlpha = .8; c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8, 2, 2); });
    c.save(); c.translate(cx, cy); c.rotate(.4); c.scale(1, .28); c.strokeStyle = col; c.lineWidth = 14; c.globalAlpha = .8; c.beginPath(); c.arc(0, 0, 130 + k * 60, 0, 6.283); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 130 + k * 60, 0, 6.283); c.stroke(); c.restore();
    c.globalAlpha = 1; c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, 20 + k * 70, 0, 6.283); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    if (u > .8) { c.globalAlpha = (1 - u) * 4 * .5; c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, (u - .8) * 5 * R, 0, 6.283); c.stroke(); } },
  (c, u, p, W, H, cx, cy, R, col) => {            // 5 Quasars: twin jets blaze out
    const sh = (1 - u) * 6; c.save(); c.translate((Math.random() - .5) * sh, (Math.random() - .5) * sh); const h = Math.min(1, u * 2.2) * H * .55;
    for (let s = -1; s <= 1; s += 2) { const g = c.createLinearGradient(cx, cy, cx, cy + s * h); g.addColorStop(0, '#fff'); g.addColorStop(.4, col); g.addColorStop(1, 'rgba(255,171,145,0)'); c.globalAlpha = .9; c.fillStyle = g;
      c.beginPath(); c.moveTo(cx - 22, cy); c.lineTo(cx + 22, cy); c.lineTo(cx + 5, cy + s * h); c.lineTo(cx - 5, cy + s * h); c.fill(); }
    p.slice(0, 160).forEach(q => { const y = cy + (q.o < .5 ? -1 : 1) * ((q.r + u * 1.5 * q.s) % 1) * h; c.globalAlpha = .8; c.fillStyle = '#ffe0b2'; c.fillRect(cx + (q.a - 3.14) * 7, y, 2, 2); });
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 90 + Math.sin(u * 60) * 10); g.addColorStop(0, '#fff'); g.addColorStop(.4, col); g.addColorStop(1, 'rgba(255,171,145,0)'); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 100, 0, 6.283); c.fill(); c.restore(); },
  (c, u, p, W, H, cx, cy, R, col) => {            // 6 Galaxies: a spiral galaxy is born
    const g0 = Math.min(1, u * 1.5), sc = .25 + ease(Math.min(1, u * 1.2)) * .9;
    p.forEach((q, i) => { const arm = i % 3, th = q.r * 5.2 + arm * 2.094 + u * 2.5, rad = q.r * R * .62 * sc * g0 + 4, x = cx + Math.cos(th) * rad, y = cy + Math.sin(th) * rad * .55;
      c.globalAlpha = .9 * (1 - q.r * .5); c.fillStyle = q.r < .25 ? '#fff6d8' : q.o < .5 ? col : '#b3e5fc'; c.fillRect(x, y, q.s * 2, q.s * 2); });
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 110 * sc); g.addColorStop(0, '#fff'); g.addColorStop(.35, 'rgba(255,236,170,.6)'); g.addColorStop(1, 'rgba(165,214,167,0)'); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 110 * sc, 0, 6.283); c.fill(); },
  (c, u, p, W, H, cx, cy, R, col) => {            // 7 Supernovae: a star swells, then detonates
    if (u < .45) { const k = u / .45, r = 30 + k * 70 + Math.sin(u * 80) * 3, g = c.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6); g.addColorStop(0, '#fff'); g.addColorStop(.5, '#ff8a65'); g.addColorStop(1, 'rgba(255,82,82,0)'); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r * 1.6, 0, 6.283); c.fill(); return; }
    const b = (u - .45) / .55; c.globalAlpha = Math.max(0, 1 - b * 3); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1 - b; c.strokeStyle = col; c.lineWidth = 18 * (1 - b) + 2; c.beginPath(); c.arc(cx, cy, b * R * 1.1, 0, 6.283); c.stroke(); c.strokeStyle = '#ffe0b2'; c.lineWidth = 5 * (1 - b); c.beginPath(); c.arc(cx, cy, b * R * .7, 0, 6.283); c.stroke();
    p.forEach(q => { const d = q.s * b * R * .9; c.globalAlpha = Math.max(0, 1 - b * 1.1); c.fillStyle = q.o < .5 ? '#ffab91' : '#fff'; c.fillRect(cx + Math.cos(q.a) * d, cy + Math.sin(q.a) * d, 2.5, 2.5); }); },
  (c, u, p, W, H, cx, cy, R, col) => {            // 8 Clusters: galaxies fall together into one bright family
    const k = ease(Math.min(1, u * 1.3)), pts = p.slice(0, 70).map(q => { const r = (1 - k) * R * (.3 + q.r * .7) + 30 + q.r * 70 * k, a = q.a + k * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8]; });
    c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = .25 * k; c.beginPath(); pts.forEach((a, i) => { for (let j = i + 1; j < pts.length; j += 7) { const b = pts[j]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 120) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } } }); c.stroke();
    pts.forEach((a, i) => { c.globalAlpha = .9; c.fillStyle = i % 3 ? '#ffe0b2' : '#fff'; c.beginPath(); c.arc(a[0], a[1], 2 + (i % 4), 0, 6.283); c.fill(); });
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 140 * k + 10); g.addColorStop(0, 'rgba(255,204,128,.8)'); g.addColorStop(1, 'rgba(255,204,128,0)'); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 140 * k + 10, 0, 6.283); c.fill(); },
  (c, u, p, W, H, cx, cy, R, col) => {            // 9 Superclusters: clusters drift together along bright threads
    const n = 6, k = ease(Math.min(1, u * 1.25)), cl = []; for (let i = 0; i < n; i++) { const a = i * 6.283 / n + u * .6, r = (1 - k) * R * .55 + 60; cl.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * .7]); }
    c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = .5; c.beginPath(); cl.forEach((a, i) => { c.moveTo(a[0], a[1]); c.lineTo(cx, cy); c.moveTo(a[0], a[1]); const b = cl[(i + 1) % n]; c.lineTo(b[0], b[1]); }); c.stroke();
    cl.forEach(a => { const g = c.createRadialGradient(a[0], a[1], 0, a[0], a[1], 45); g.addColorStop(0, '#fff'); g.addColorStop(.4, col); g.addColorStop(1, 'rgba(206,147,216,0)'); c.globalAlpha = .9; c.fillStyle = g; c.beginPath(); c.arc(a[0], a[1], 45, 0, 6.283); c.fill(); });
    if (u > .6) { const b = (u - .6) / .4; c.globalAlpha = (1 - b) * .8; c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, b * R * .6, 0, 6.283); c.stroke(); } },
  (c, u, p, W, H, cx, cy, R, col) => {            // 10 Cosmic Web: glowing filaments connect the dark
    const m = Math.floor(Math.min(1, u * 1.6) * 80), pts = p.slice(0, 80).map(q => [cx + (q.r - .5) * W * .9, cy + (q.o - .5) * H * .8]);
    c.strokeStyle = col; c.lineWidth = 1.5; c.globalAlpha = .55; c.beginPath(); for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const a = pts[i], b = pts[j]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < W * .22) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } } c.stroke();
    for (let i = 0; i < m; i++) { const g = 1 + Math.sin(u * 20 + i) * .4; c.globalAlpha = .9; c.fillStyle = '#e1f5fe'; c.beginPath(); c.arc(pts[i][0], pts[i][1], 3 * g, 0, 6.283); c.fill(); } },
  (c, u, p, W, H, cx, cy, R, col) => {            // 11 Universes: bubble universes bud off a big bang
    if (u < .15) { c.globalAlpha = 1 - u / .15; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); }
    for (let i = 0; i < 9; i++) { const q = p[i], t = Math.max(0, Math.min(1, u * 1.4 - q.o * .5)), r = ease(t) * (60 + q.s * 130), x = cx + Math.cos(q.a) * q.r * R * .45 * t, y = cy + Math.sin(q.a) * q.r * R * .35 * t;
      const g = c.createRadialGradient(x, y, r * .6, x, y, r + 1); g.addColorStop(0, 'rgba(255,245,157,0)'); g.addColorStop(.9, 'rgba(255,245,157,.35)'); g.addColorStop(1, 'rgba(255,255,255,.9)');
      c.globalAlpha = Math.min(1, t * 3); c.fillStyle = g; c.beginPath(); c.arc(x, y, r + 1, 0, 6.283); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); } }];
function endAnim() { A = null; fx.style.display = 'none'; fx.onclick = null; }
function playFirst(l) {
  toast(`First ${LAY[l].n}!`);
  if (reduce) return;
  const running = !!A;
  fx.width = innerWidth; fx.height = innerHeight; fx.style.display = 'block';
  A = { l, t0: performance.now(), dur: l === 6 || l === NL - 1 ? 7500 : 5200, W: fx.width, H: fx.height, P: Array.from({ length: l === 6 ? 560 : 320 }, () => ({ a: Math.random() * 6.283, r: Math.random(), s: .5 + Math.random(), o: Math.random() })) };
  fx.onclick = endAnim; if (!running) requestAnimationFrame(animFrame);
}
function animFrame(now) {
  if (!A) return; const { l, t0, dur, W, H, P: pt } = A, u = (now - t0) / dur; if (u >= 1) return endAnim();
  fc.globalAlpha = 1; fc.clearRect(0, 0, W, H); fc.fillStyle = 'rgba(2,3,10,' + Math.min(.92, u * 5) + ')'; fc.fillRect(0, 0, W, H);
  DRAW[l](fc, u, pt, W, H, W / 2, H / 2, Math.hypot(W, H) / 2, LAY[l].col);
  if (u > .3) { fc.globalAlpha = Math.min(1, (u - .3) * 4) * (u > .88 ? (1 - u) / .12 : 1); fc.fillStyle = '#fff'; fc.textAlign = 'center'; fc.font = 'bold ' + Math.min(54, W / 11) + 'px Verdana,sans-serif'; fc.fillText(LAY[l].n.toUpperCase(), W / 2, H * .86);
    fc.font = Math.min(16, W / 26) + 'px Verdana,sans-serif'; fc.fillStyle = LAY[l].col; fc.fillText(LAY[l].tag, W / 2, H * .86 + 28); }
  fc.globalAlpha = 1; requestAnimationFrame(animFrame);
}

/* ---------- music: five generated tracks, auto-picked by progress ---------- */
let ac, bus, mtimer, track = 'off', vol = .5, mstep = 0, nextT = 0, playing = null;
function tone(f, t, d, v, type) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(.05, d * .3)); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .05); }
function kick(t) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + .15); g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .25); }
const hz = (root, semi) => root * 2 ** (semi / 12), pick = a => a[Math.random() * a.length | 0];
const TRACKS = {
  drift:   { name: 'Drift', dt: 3.6, play(s, t) { const r = hz(110, [0, -2, -4, -7][s % 4]); [0, 7, 12].forEach((x, i) => tone(hz(r, x), t, 7, .05 / (1 + i * .4), 'triangle')); for (let k = 0; k < 3; k++) tone(hz(r * 4, pick([0, 3, 5, 7, 10, 12])), t + k * 1.1, 2.4, .03); } },
  pulse:   { name: 'Pulse', dt: .21, play(s, t) { const r = hz(110, [0, 0, -2, -4][(s >> 4) % 4]), arp = [0, 3, 7, 10, 12, 10, 7, 3]; tone(hz(r * 2, arp[s % 8]), t, .28, .07, 'triangle'); if (s % 4 === 0) kick(t); if (s % 16 === 0) [0, 7, 12].forEach(x => tone(hz(r, x), t, 3.2, .04, 'sine')); } },
  nebula:  { name: 'Nebula', dt: 1.9, play(s, t) { tone(110, t, 4.5, .04, 'sine'); tone(hz(220, [0, 7][s % 2]), t, 4.5, .03, 'sine'); for (let k = 0; k < 2; k++) tone(hz(440, pick([0, 2, 4, 6, 7, 9, 11, 12])), t + k * .9, 3.5, .035); } },
  horizon: { name: 'Event Horizon', dt: 4, play(s, t) { tone(55, t, 8.5, .1); tone(82.4, t, 8.5, .06); tone(hz(110, 6), t + 1, 7, .035, 'triangle'); if (s % 3 === 0) tone(hz(880, pick([0, 1, 6])), t + 2.5, 3, .02); } },
  starlight: { name: 'Starlight', dt: .5, play(s, t) { const mel = [0, 4, 7, 12, 9, 7, 4, 2, 0, 4, 9, 7, 5, 4, 2, 4], n = mel[s % 16]; tone(hz(261.6, n), t, 1.4, .06); tone(hz(523.2, n), t, .9, .02); if (s % 8 === 0) tone(hz(130.8, [0, -3, -5, -7][(s >> 3) % 4]), t, 3.8, .07, 'triangle'); } },
};
const autoTrack = () => { const h = S().times.reduce((a, x, i) => x > 0 ? i : a, 0); return h >= 9 ? 'starlight' : h >= 6 ? 'horizon' : h >= 4 ? 'pulse' : h >= 2 ? 'nebula' : 'drift'; };
function musicTick() {
  if (!ac || track === 'off') return; const want = track === 'auto' ? autoTrack() : track; if (want !== playing) { playing = want; mstep = 0; nextT = ac.currentTime + .1; }
  while (nextT < ac.currentTime + .5) { TRACKS[playing].play(mstep++, nextT); nextT += TRACKS[playing].dt; }
}
function setMusic(v) {
  track = v; clearInterval(mtimer); if (v === 'off') { if (ac) ac.suspend(); return; }
  try { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); bus = ac.createGain(); const dl = ac.createDelay(); dl.delayTime.value = .45; const fb = ac.createGain(); fb.gain.value = .45; bus.connect(ac.destination); bus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(ac.destination); }
    bus.gain.value = vol; ac.resume(); } catch (e) { toast('Audio is not available here.'); track = 'off'; $('track').value = 'off'; return; }
  playing = null; mtimer = setInterval(musicTick, 120);
}
$('track').innerHTML = '<option value="off">Off</option><option value="auto">Auto (follows your progress)</option>' + Object.entries(TRACKS).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');
$('track').onchange = e => setMusic(e.target.value);
$('vol').oninput = e => { vol = e.target.value / 100; if (bus) bus.gain.value = vol; };
document.addEventListener('visibilitychange', () => { if (ac && track !== 'off') document.hidden ? ac.suspend() : ac.resume(); if (document.hidden) save(); });

/* ---------- save / load ---------- */
const save = () => { S().last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S())); return true; } catch (e) { return false; } };
$('save').onclick = () => toast(save() ? 'Game saved.' : 'Could not save. Is storage blocked?');
$('export').onclick = () => { save(); const c = btoa(JSON.stringify(S())); navigator.clipboard ? navigator.clipboard.writeText(c).then(() => toast('Save code copied.'), () => prompt('Save code:', c)) : prompt('Save code:', c); };
$('import').onclick = () => { const c = prompt('Paste save code:'); if (!c) return; const bak = JSON.stringify(S()); try { C.load(JSON.parse(atob(c.trim()))); save(); ui(); toast('Imported.'); } catch (e) { C.load(JSON.parse(bak)); toast('That save code is not valid.'); } };
$('reset').onclick = () => { if (confirm('Hard reset everything? This cannot be undone.')) { C.load(C.fresh()); save(); ui(); } };

/* ---------- refresh: everything shown is derived from state, so the UI cannot drift ---------- */
let chipKey = '';
function ui() {
  const s = S(), fx_ = C.fx();
  setT($('dust'), fmt(s.dust)); setT($('rate'), fmt(C.rate()));
  const ck = s.c.map((c, i) => i && c > 0 ? i : '').join(''); if (ck !== chipKey) { chipKey = ck; $('chips').innerHTML = ''; for (let i = 1; i < NL; i++) if (s.c[i] > 0) { const e = mk('span', 'chip'); e.style.setProperty('--c', LAY[i].col); e.dataset.i = i; $('chips').appendChild(e); } }
  for (const e of $('chips').children) { const i = +e.dataset.i; setT(e, `${fmt(s.c[i])} ${LAY[i].s}`); }
  for (let l = 1; l < NL; l++) { const u = C.tabUnlocked(l); if (u && !seenTab[l]) { seenTab[l] = true; if (!TB[l].classList.contains('on')) TB[l].classList.add('new'); } TB[l].hidden = !u; }
  if (tab >= 1 && tab < NL && !C.tabUnlocked(tab)) { tab = 0; show(); }
  if (tab === 0) {
    $('ba0').disabled = !NODES.some(n => n.t === 0 && C.canBuy(n)); $('autoL').hidden = !fx_.autoBuy; $('autoC').checked = s.autoOn; updTree(0);
  } else if (tab >= 1 && tab < NL) {
    const l = tab, r = L[l], prev = l === 1 ? 'CD' : LAY[l - 1].s, g = C.gainOf(l), need = C.reqOf(l), ratio = Math.min(1, s.e[l - 1] / need);
    setT(r.cur, fmt(s.c[l])); setT(r.boost, fmt(C.boostOf(l))); r.bar.style.width = (ratio * 100).toFixed(1) + '%';
    setT(r.req, g >= 1 ? 'Ready. Resetting wipes dust and every layer below this one, but keeps this layer.' : `${fmt(s.e[l - 1])} / ${fmt(need)} ${prev} earned this run`);
    r.go.disabled = g < 1; setT(r.go, g >= 1 ? `${LAY[l].verb} for +${fmt(g)} ${LAY[l].s}` : `${LAY[l].verb} (not ready)`);
    setT(r.en, fmt(s.en[l])); setT(r.er, fmt(C.enRate(l)));
    r.buys.forEach((b, i) => { const c = C.buyCost(l, i); setT(b.querySelector('.lv'), 'Lv ' + s.lv[l][i]); setT(b.querySelector('.cst'), `Cost: ${fmt(c)} ${LAY[l].en}`); b.disabled = s.en[l] < c; });
    r.ms.forEach((li, i) => li.classList.toggle('done', s.times[l] >= C.MS[i][0]));
    r.ba.disabled = !NODES.some(n => n.t === l && C.canBuy(n)); updTree(l);
  }
  while (C.Q.length) { const q = C.Q.shift(); if (q[0] === 'first') playFirst(q[1]); else if (q[0] === 'end') toast('You completed the Galaxies tree! Thanks for playing.'); }
}
function updTree(t) {
  const T = TREES[t]; if (!T) return;
  NODES.forEach(n => {
    if (n.t !== t) return; const b = T.els[n.id], own = C.has(n.id), open = !n.parent || C.has(n.parent), par = n.parent && C.NODE[n.parent];
    const visible = own || open || !par.parent || C.has(par.parent);       // the tree grows: you only see two steps ahead
    const cls = 'node' + (own ? ' owned' : !open ? ' locked' : C.canBuy(n) ? ' ready' : '') + (visible ? '' : ' hide'); if (b.className !== cls) b.className = cls; b.disabled = own || !open || !C.canBuy(n);
  });
  T.lines.forEach(([p, id]) => { p.classList.toggle('on', C.has(id)); const v = !T.els[id].classList.contains('hide'); if (p._v !== v) { p._v = v; p.style.display = v ? '' : 'none'; } });
}

/* ---------- start ---------- */
try { const raw = localStorage.getItem(KEY); if (raw) C.load(JSON.parse(raw)); } catch (e) { C.load(C.fresh()); }
for (let l = 1; l < NL; l++) seenTab[l] = C.tabUnlocked(l);
{ const away = Math.max(0, Math.min((Date.now() - S().last) / 1000, C.OFFLINE_MAX)); if (away > 30) { const n = Math.min(240, Math.ceil(away / 30)); for (let i = 0; i < n; i++) C.step(away / n); toast('Welcome back! Simulated ' + Math.round(away / 60) + ' minutes offline.'); } }
let prev = Date.now();
setInterval(() => { const now = Date.now(), dt = Math.max(0, Math.min((now - prev) / 1000, C.OFFLINE_MAX)); prev = now; if (dt > 2) { const n = Math.min(240, Math.ceil(dt / 10)); for (let i = 0; i < n; i++) C.step(dt / n); } else C.step(dt); }, 100);
setInterval(() => { if (!document.hidden) ui(); }, 150);
setInterval(save, 10000); addEventListener('beforeunload', save);
if (typeof window.__GUT_TEST__ === 'object') window.__GUT_TEST__.setTab = t => { tab = t; show(); ui(); };
show(); ui();
})();
