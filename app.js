(() => {
'use strict';
const C = Core, { fmt, lg, cmp, num, fromLog, LAY, NODES, NODE, REQ } = C;
const $ = id => document.getElementById(id);
const S = () => C.get();
const SAVE_KEY = 'galaxy-tree-save-v1';
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
const setT = (el, t) => { if (el._t !== t) { el.textContent = t; el._t = t; } };
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 3200); }

/* ---------- 3D layout: each tree is a cluster; later trees sit further out, so the galaxy grows ---------- */
const POS = {}, CEN = {};
for (let t = 0; t < 7; t++) { const th = t * 2.4, R = t ? 260 + t * 90 : 0; CEN[t] = [Math.cos(th) * R, t ? (t % 2 ? 1 : -1) * (40 + t * 25) : 0, Math.sin(th) * R]; }
NODES.forEach(n => {
  const t = n.t, th = t * 2.4, c = CEN[t], u = t ? [Math.cos(th), .25, Math.sin(th)] : [0, 1, 0];
  const a = t ? [-Math.sin(th), 0, Math.cos(th)] : [1, 0, 0], b = t ? [0, 1, 0] : [0, 0, 1];
  const d = Math.floor(Math.log2(n.k + 1)), j = n.k + 1 - 2 ** d, w = 2 ** d;
  const depth = d * 75, spread = (j - (w - 1) / 2) * 58, wob = Math.sin(n.k * 2.1 + t) * 22;
  POS[n.id] = [0, 1, 2].map(i => c[i] + u[i] * depth + a[i] * spread + b[i] * wob);
});
const focusOf = t => { const th = t * 2.4, c = CEN[t]; return t ? [c[0] + Math.cos(th) * 110, c[1] + 30, c[2] + Math.sin(th) * 110] : [0, 120, 0]; };

/* ---------- camera ---------- */
const cam = { yaw: .5, pitch: .35, dist: 650, tx: 0, ty: 120, tz: 0, gx: 0, gy: 120, gz: 0, gd: 650, idle: 0 };
let W = 1, H = 1, F = 1, DPR = 1;
const cv = $('cv'), ctx = cv.getContext('2d');
let quality = 2, eco = false, bg, rz = 0;
try { eco = localStorage.getItem('gut-eco') === '1'; } catch (e) {}
function resize() {
  DPR = quality === 2 ? Math.min(2, devicePixelRatio || 1) : 1; W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; F = Math.min(W, H) * 1.15;
  bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2); bg.addColorStop(0, '#0d1230'); bg.addColorStop(1, '#03040a');
}
addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resize); }); resize();
function focus(t) { const f = focusOf(t); cam.gx = f[0]; cam.gy = f[1]; cam.gz = f[2]; cam.gd = t ? 520 : 650; }
function proj(p, noTrans) {
  const x = p[0] - (noTrans ? 0 : cam.tx), y = p[1] - (noTrans ? 0 : cam.ty), z = p[2] - (noTrans ? 0 : cam.tz);
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), x1 = x * cy - z * sy, z1 = x * sy + z * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), y1 = y * cp - z1 * sp; let z2 = y * sp + z1 * cp;
  if (!noTrans) z2 += cam.dist;
  if (z2 < (noTrans ? .05 : 30)) return null;
  const s = F / z2; return { x: W / 2 + x1 * s, y: H / 2 - y1 * s, z: z2, s };
}
let SX = 0, SY = 0;
function starProj(p) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), x1 = p[0] * cy - p[2] * sy, z1 = p[0] * sy + p[2] * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), y1 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
  if (z2 < .05) return false; const k = F / z2 * .9; SX = W / 2 + x1 * k; SY = H / 2 - y1 * k; return true;
}
const STARS = Array.from({ length: 420 }, (_, i) => { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1); return [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a), .4 + Math.random() * .6, Math.random() * 6]; });

/* ---------- input: mouse, touch and pen through pointer events ---------- */
const ptrs = new Map(), shown = []; let down = null, hover = null, sel = null;
const nodeAt = (x, y) => { let best = null, bd = 1e9; for (const s of shown) { const d = Math.hypot(s.x - x, s.y - y); if (d < Math.max(s.r + 8, 18) && d < bd) { bd = d; best = s.n; } } return best; };
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  down = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 } : null; cam.idle = 0; cv.classList.add('drag');
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) { hover = nodeAt(e.clientX, e.clientY); cv.classList.toggle('pick', !!hover); return; }
  cam.idle = 0;
  if (ptrs.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; cam.yaw -= dx * .006; cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * .006)); if (down) down.moved += Math.abs(dx) + Math.abs(dy); }
  else if (ptrs.size === 2) { const o = [...ptrs.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (d0 > 0 && d1 > 0) { cam.dist = Math.max(120, Math.min(4000, cam.dist * d0 / d1)); cam.gd = cam.dist; } }
  p.x = e.clientX; p.y = e.clientY;
});
const up = e => {
  ptrs.delete(e.pointerId); cv.classList.remove('drag');
  if (down && e.type === 'pointerup' && down.moved < 8 && performance.now() - down.t < 450) tap(e.clientX, e.clientY);
  down = null;
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(120, Math.min(4000, cam.dist * Math.exp(e.deltaY * .0012))); cam.gd = cam.dist; cam.idle = 0; }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
function tap(x, y) {
  const n = nodeAt(x, y);
  if (!n) { sel = null; return; }
  if (sel === n && C.canBuy(n)) { buyNode(n); } else sel = n;
}
function buyNode(n) { if (C.buy(n.id)) { pulse(n); ui(); } }
let pulses = [];
function pulse(n) { pulses.push({ id: n.id, t: performance.now() }); }
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input')) return;
  const k = e.key;
  if (k === 'ArrowLeft') cam.yaw -= .1; else if (k === 'ArrowRight') cam.yaw += .1;
  else if (k === 'ArrowUp') cam.pitch = Math.min(1.45, cam.pitch + .1); else if (k === 'ArrowDown') cam.pitch = Math.max(-1.45, cam.pitch - .1);
  else if (k === '+' || k === '=') { cam.dist = Math.max(120, cam.dist * .9); cam.gd = cam.dist; } else if (k === '-') { cam.dist = Math.min(4000, cam.dist * 1.1); cam.gd = cam.dist; }
  else if (k === 'b' || k === 'B') { C.buyAll(); ui(); } else if (k === 'Enter' && sel && !e.target.closest('button')) buyNode(sel); else if (k === 'Escape') sel = null;
});

/* ---------- drawing: sprites are pre-rendered once, so each node costs one drawImage ---------- */
const IDX = {}; NODES.forEach((n, i) => IDX[n.id] = i);
const BYT = [0, 1, 2, 3, 4, 5, 6].map(t => NODES.filter(n => n.t === t));
const sprites = new Map(), pc = new Array(NODES.length), vis = [];
function sprite(kind, col) {
  const key = kind + col; let c = sprites.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = kind === 'glow' ? x.createRadialGradient(32, 32, 0, 32, 32, 32) : x.createRadialGradient(24, 24, 3, 32, 32, 30);
  if (kind === 'glow') { g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); }
  else { g.addColorStop(0, kind === 'on' ? '#ffffff' : kind === 'open' ? col : '#667'); g.addColorStop(1, kind === 'on' ? col : kind === 'open' ? '#202850' : '#151830'); }
  x.fillStyle = g; x.beginPath(); x.arc(32, 32, kind === 'glow' ? 32 : 30, 0, 6.283); x.fill(); sprites.set(key, c); return c;
}
let warp = null;
function warpFx(i) { if (!reduce) warp = { t0: performance.now(), col: LAY[i].col, big: false }; }
function draw(now) {
  const s = S(), un = C.unlocked(), twinkle = !eco && !reduce;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const ns = eco ? 120 : quality === 2 ? 420 : quality === 1 ? 240 : 120; ctx.fillStyle = '#cfd6ff';
  for (let b = 0; b < 3; b++) { ctx.globalAlpha = twinkle ? .45 + .35 * Math.sin(now / 700 + b * 2) : .65; for (let i = b; i < ns; i += 3) { if (starProj(STARS[i])) { const z = STARS[i][3] > .8 ? 2 : 1; ctx.fillRect(SX, SY, z, z); } } }
  vis.length = 0;
  for (let i = 0; i < NODES.length; i++) { const n = NODES[i]; const p = un[n.t] ? proj(POS[n.id]) : null; pc[i] = p; if (p) vis.push(n); }
  ctx.lineWidth = 1.5;
  for (let t = 0; t < 7; t++) {
    if (!un[t]) continue;
    for (let pass = 0; pass < 2; pass++) {       // pass 0: not owned, pass 1: owned. Two strokes per tree instead of one per edge
      ctx.beginPath(); let any = false;
      for (const n of BYT[t]) {
        const p = pc[IDX[n.id]]; if (!p) continue;
        const q = n.parent ? pc[IDX[n.parent]] : t && un[t - 1] ? pc[IDX[`${t - 1}.0`]] : null; if (!q) continue;
        if ((pass === 1) !== C.has(n.id)) continue; ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); any = true;
      }
      if (any) { ctx.globalAlpha = pass ? .8 : .4; ctx.strokeStyle = pass ? LAY[t].col : '#3a4170'; ctx.stroke(); }
    }
  }
  vis.sort((a, b) => pc[IDX[b.id]].z - pc[IDX[a.id]].z);
  shown.length = 0;
  for (const n of vis) {
    const p = pc[IDX[n.id]], col = LAY[n.t].col, owned = C.has(n.id), open = !n.parent || C.has(n.parent), can = C.canBuy(n);
    const r = Math.max(3, 13 * p.s), fog = Math.max(.35, Math.min(1, 1.3 - p.z / (cam.dist * 3)));
    const pu = pulses.length ? pulses.find(x => x.id === n.id) : null, pk = pu ? Math.max(0, 1 - (now - pu.t) / 600) : 0;
    if ((owned || can || pk) && quality > 0) { const gs = r * (can ? 6 + (twinkle ? Math.sin(now / 250) : 0) : 4.6) + pk * r * 8; ctx.globalAlpha = fog * (can ? 1 : .6); ctx.drawImage(sprite('glow', col), p.x - gs / 2, p.y - gs / 2, gs, gs); }
    ctx.globalAlpha = owned ? fog : fog * (open ? .9 : .45);
    ctx.drawImage(sprite(owned ? 'on' : open ? 'open' : 'lock', col), p.x - r * 1.07, p.y - r * 1.07, r * 2.14, r * 2.14);
    ctx.lineWidth = 2; ctx.strokeStyle = n === sel ? '#ffffff' : col; ctx.globalAlpha = n === sel ? 1 : fog * (open ? .9 : .35);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.stroke();
    shown.push({ n, x: p.x, y: p.y, r });
    if (n === sel || n === hover) { ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '12px Verdana,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.name, p.x, p.y - r - 8); }
  }
  if (pulses.length) pulses = pulses.filter(x => now - x.t < 600);
  ctx.globalAlpha = 1;
  if (warp) {
    const u = (now - warp.t0) / (warp.big ? 4000 : 1100);
    if (u >= 1) warp = null; else {
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.strokeStyle = warp.col; ctx.lineWidth = 2; ctx.beginPath();
      const n = quality ? 90 : 40; for (let i = 0; i < n; i++) { const a = i * 2.399, d0 = (u * 1.2 + (i % 7) * .02) * Math.hypot(W, H) * .5, d1 = d0 + 30 + u * 120; ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); ctx.lineTo(Math.cos(a) * d1, Math.sin(a) * d1); }
      ctx.globalAlpha = (1 - u) * .8; ctx.stroke(); ctx.restore();
      if (u < .15) { ctx.globalAlpha = (1 - u / .15) * .6; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      if (warp.big) { ctx.globalAlpha = Math.min(1, u * 3) * (1 - u); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.min(54, W / 10) + 'px Verdana,sans-serif'; ctx.fillText('GALAXY COMPLETE', W / 2, H / 2); }
      ctx.globalAlpha = 1;
    }
  }
}

/* ---------- HUD (derived from state every refresh, so it can never drift out of sync) ---------- */
function hold(btn, fn) {
  let t1, t2; const stop = () => { clearTimeout(t1); clearInterval(t2); };
  btn.addEventListener('pointerdown', e => { if (e.button > 0) return; fn(); ui(); t1 = setTimeout(() => { t2 = setInterval(() => { fn(); ui(); }, 90); }, 350); });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); ui(); } });
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
hold($('buyall'), () => C.buyAll());
$('layersBtn').onclick = () => { $('layers').hidden = !$('layers').hidden; $('menu').hidden = true; ui(); };
$('menuBtn').onclick = () => { $('menu').hidden = !$('menu').hidden; $('layers').hidden = true; };
$('buy').onclick = () => { if (sel) buyNode(sel); };
const ecoLabel = () => { $('eco').textContent = 'Eco mode: ' + (eco ? 'on' : 'off'); };
$('eco').onclick = () => { eco = !eco; try { localStorage.setItem('gut-eco', eco ? '1' : '0'); } catch (e) {} ecoLabel(); };
ecoLabel();
$('cam').onclick = () => { cam.yaw = .5; cam.pitch = .35; focus(0); };
const layerEls = [];
for (let i = 1; i < 7; i++) {
  const e = document.createElement('div'); e.className = 'layer'; e.style.setProperty('--c', LAY[i].col); e.hidden = true;
  e.innerHTML = `<b>${LAY[i].n}</b><div class="dim small st"></div><button class="go"></button><label class="small dim"><input type="checkbox"> Auto</label>`;
  e.querySelector('.go').onclick = () => { if (C.reset(i)) { warpFx(i); focus(i); ui(); } };
  e.querySelector('input').onchange = ev => { S().resetOn[i] = ev.target.checked; };
  $('layers').appendChild(e); layerEls[i] = e;
}
let chipKey = '', chipEls = [];
function ui() {
  const s = S(), fx = C.fx();
  setT($('dust'), fmt(s.dust)); setT($('rate'), fmt(C.rate()));
  const key = s.c.map((c, i) => i && c.m ? i : '').join(''); if (key !== chipKey) { chipKey = key; $('chips').innerHTML = ''; chipEls = []; for (let i = 1; i < 7; i++) if (s.c[i].m) { const b = document.createElement('button'); b.className = 'chip'; b.style.setProperty('--c', LAY[i].col); b.onclick = () => focus(i); $('chips').appendChild(b); chipEls.push([b, i]); } }
  chipEls.forEach(([b, i]) => setT(b, `${fmt(s.c[i])} ${LAY[i].s}`));
  const un = C.unlocked(); $('buyall').disabled = !C.NODES.some(n => un[n.t] && C.canBuy(n));
  const n = sel; $('info').hidden = !n;
  if (n) {
    const owned = s.nodes.includes(n.id), open = !n.parent || s.nodes.includes(n.parent), cur = n.t ? LAY[n.t].s : 'Dust', can = C.canBuy(n);
    setT($('nm'), `${n.name} (${LAY[n.t].n} tree)`); setT($('fxd'), C.describe(n)); setT($('cost'), owned ? 'Owned' : `Cost: ${fmt(C.nodeCost(n))} ${cur}`);
    setT($('state'), owned ? 'Already bought.' : !open ? 'Locked: buy the connected node before it first.' : can ? 'Ready to buy.' : `You need more ${cur}.`);
    $('buy').disabled = !can; setT($('buy'), owned ? 'Owned' : can ? 'Buy' : 'Not yet');
  }
  if (!$('layers').hidden) for (let i = 1; i < 7; i++) {
    const e = layerEls[i], ok = s.times[i] > 0 || lg(s.e[i - 1]) >= REQ[i] - 1, g = C.gainOf(i); e.hidden = !ok; if (!ok) continue;
    setT(e.querySelector('.st'), `You have ${fmt(s.c[i])} ${LAY[i].s} (reset ${s.times[i].toLocaleString('en-US')}×). Needs ${fmt(fromLog(REQ[i]))} ${LAY[i - 1].s} earned this run.`);
    e.querySelector('.go').disabled = !g.m; setT(e.querySelector('.go'), g.m ? `${LAY[i].verb} for +${fmt(g)} ${LAY[i].s}` : `${fmt(s.e[i - 1])} / ${fmt(fromLog(REQ[i]))}`);
    e.querySelector('label').hidden = !fx.auto[i]; e.querySelector('input').checked = s.resetOn[i];
  }
  while (C.Q.length) { const q = C.Q.shift(); if (q[0] === 'end') { warp = { t0: performance.now(), col: '#ffffff', big: true }; toast('You completed the Galaxy!'); } }
}

/* ---------- music (generated, no files) ---------- */
let ac, bus, timer, musicOn = false;
function tone(f, t, d, v) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * .35); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .1); }
function music(on) {
  clearInterval(timer);
  if (!on) { if (ac) ac.suspend(); return; }
  try {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); bus = ac.createGain(); bus.gain.value = .5; const dl = ac.createDelay(); dl.delayTime.value = .5; const fb = ac.createGain(); fb.gain.value = .5; bus.connect(ac.destination); bus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(ac.destination); }
    ac.resume();
  } catch (e) { toast('Audio is not available here.'); musicOn = false; return; }
  const prog = [0, -2, -4, -7], pent = [0, 3, 5, 7, 10, 12, 15]; let bar = 0;
  const play = () => { const t = ac.currentTime + .05, root = 82.4 * 2 ** (prog[bar++ % 4] / 12); [0, 7, 12].forEach((x, i) => tone(root * 2 ** (x / 12), t, 8, .06 / (1 + i * .4)));
    const n = 3 + S().times.filter(x => x > 0).length; for (let k = 0; k < n; k++) tone(root * 4 * 2 ** (pent[Math.random() * 7 | 0] / 12), t + k * 6 / n, 2.4, .03); };
  play(); timer = setInterval(play, 8000);
}
$('music').onclick = () => { musicOn = !musicOn; music(musicOn); $('music').textContent = 'Music: ' + (musicOn ? 'on' : 'off'); };
document.addEventListener('visibilitychange', () => { if (ac && musicOn) document.hidden ? ac.suspend() : ac.resume(); if (document.hidden) save(); });

/* ---------- save / load ---------- */
const save = () => { S().last = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S())); return true; } catch (e) { return false; } };
$('save').onclick = () => toast(save() ? 'Game saved.' : 'Could not save. Is storage blocked?');
$('export').onclick = () => { save(); const c = btoa(JSON.stringify(S())); navigator.clipboard ? navigator.clipboard.writeText(c).then(() => toast('Save code copied.'), () => prompt('Save code:', c)) : prompt('Save code:', c); };
$('import').onclick = () => { const c = prompt('Paste save code:'); if (!c) return; try { C.load(JSON.parse(atob(c.trim()))); sel = null; save(); ui(); toast('Imported.'); } catch (e) { toast('That save code is not valid.'); } };
$('reset').onclick = () => { if (confirm('Hard reset everything? This cannot be undone.')) { C.load(C.fresh()); sel = null; save(); ui(); } };

/* ---------- start ---------- */
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) C.load(JSON.parse(raw)); } catch (e) { C.load(C.fresh()); }
{ const away = Math.min((Date.now() - S().last) / 1000, C.OFFLINE_MAX); if (away > 30) { const n = Math.min(240, Math.ceil(away / 30)); for (let i = 0; i < n; i++) C.step(away / n); toast('Welcome back! Simulated ' + Math.round(away / 60) + ' minutes offline.'); } }
let prev = Date.now(), lastUI = 0, lastT = performance.now();
setInterval(() => { const now = Date.now(); const dt = Math.min((now - prev) / 1000, C.OFFLINE_MAX); prev = now; if (dt > 2) { const n = Math.min(240, Math.ceil(dt / 10)); for (let i = 0; i < n; i++) C.step(dt / n); } else C.step(dt); }, 100);
setInterval(save, 10000); addEventListener('beforeunload', save);
let lastDraw = 0, dAvg = 4, slowFrames = 0;
function frame(now) {
  requestAnimationFrame(frame); if (document.hidden) return;
  if (eco && now - lastDraw < 33) return;                      // eco mode: 30 fps
  lastDraw = now; const dt = Math.min(.05, (now - lastT) / 1000); lastT = now; cam.idle += dt;
  const k = 1 - Math.pow(.001, dt); cam.tx += (cam.gx - cam.tx) * k; cam.ty += (cam.gy - cam.ty) * k; cam.tz += (cam.gz - cam.tz) * k; if (!ptrs.size) cam.dist += (cam.gd - cam.dist) * k;
  if (!reduce && !eco && cam.idle > 12 && !ptrs.size) cam.yaw += dt * .05;
  const t0 = performance.now(); draw(now); dAvg = dAvg * .95 + (performance.now() - t0) * .05;
  if (dAvg > 11 && quality > 0 && ++slowFrames > 90) { quality--; slowFrames = 0; dAvg = 4; resize(); }   // adaptive quality for slow devices
  if (now - lastUI > 100) { lastUI = now; ui(); }
}
requestAnimationFrame(frame); ui();
})();
