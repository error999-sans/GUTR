/* Galactic Upg Tree : Remade, core logic (no DOM; simulated in Node for balance). Plain numbers: dust never gets absurd. */
(function (root) {
'use strict';
const SUF = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n) || n <= 0) return '0';
  if (n < 1000) return n < 10 ? String(Math.round(n * 100) / 100) : n < 100 ? String(Math.round(n * 10) / 10) : String(Math.floor(n));
  let i = Math.floor(Math.log10(n) / 3), m = n / 10 ** (3 * i); if (m >= 999.995) { m /= 1000; i++; }
  return i > SUF.length ? n.toExponential(2).replace('e+', 'e') : m.toFixed(2) + SUF[i - 1];
}

/* ---------- Config: balance lives here ---------- */
const LAY = [
  { n: 'Cosmic Dust', s: 'CD', col: '#9fb4ff' },
  { n: 'Stars',       s: 'Stars',   verb: 'Condense', en: 'Starlight', col: '#ffe082', tag: 'Gather your dust into burning stars.' },
  { n: 'Nebulae',     s: 'Nebulae', verb: 'Expand',   en: 'Gas',       col: '#f48fb1', tag: 'Stars bloom into vast glowing clouds.' },
  { n: 'Pulsars',     s: 'Pulsars', verb: 'Spin up',  en: 'Pulses',    col: '#80deea', tag: 'Dead stars spin and sweep the dark.' },
  { n: 'Black Holes', s: 'Holes',   verb: 'Collapse', en: 'Matter',    col: '#b39ddb', tag: 'Gravity folds everything inward.' },
  { n: 'Quasars',     s: 'Quasars', verb: 'Ignite',   en: 'Plasma',    col: '#ffab91', tag: 'Hungry cores blaze across the universe.' },
  { n: 'Galaxies',    s: 'Galaxies', verb: 'Birth',   en: 'Worlds',    col: '#a5d6a7', tag: 'Everything you built begins to turn.' },
];
const REQ = [0, 3400, 170000, 93, 41, 80, 40];   // earned amount of the previous currency needed for each reset (calibrated by simulation)
const TC = [10, 1, 1, 1, 1, 1, 1];                    // first node cost of each tree
const TR = [2.4, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9];       // cost ratio per node
const TM = [3, 2.4, 2.2, 2, 1.9, 1.8, 1.7], GAINM = 1.5, ALLM = 1.3;   // dust nodes, next-layer gain nodes, everything nodes
const GS = [0, 1, 1, 1, 2, 4, 4];                       // gain scale per layer (later layers give larger whole-number rewards)
const BOOST = [0, .25, .3, .35, .4, .45, .5];         // dust x (1 + currency)^BOOST, per layer
const EN_RATE = .2;                                   // energy per second per currency owned
const BUY = [{ b: 10, r: 1.6 }, { b: 50, r: 1.9 }, { b: 100, r: 1.7 }], BSCALE = 3;
const SOFT = 1e6;
const AUTO_F = [0, 3, 3, 3, 2.5, 2, 2], OFFLINE_MAX = 12 * 3600, DUST_CAP = 1e300;
const BUYABLES = [['Amplifier', 'Cosmic Dust ×1.25 per level'], ['Gravity lens', 'Reset gain +20% per level'], ['Engine', 'Energy ×1.3 per level']];

/* ---------- Trees: 15 nodes each, binary. Every node doubles dust; others add extras. k=6 unlocks automation. ---------- */
const NODES = [];
for (let t = 0; t < 7; t++) for (let k = 0; k < 15; k++) {
  const r = ['I', 'II', 'III', 'IV', 'V'][Math.floor(k / 3)]; let fx, name;
  if (k === 6 && t === 1) { fx = [['autoBuy']]; name = 'Auto-Builder'; }
  else if (k % 3 === 1) { fx = [['gain', GAINM]]; name = 'Gravity Lens ' + r; }
  else if (k % 3 === 2) { fx = [['all', ALLM]]; name = 'Resonance ' + r; }
  else { fx = [['dust', TM[t]]]; name = 'Dust Well ' + r; }
  NODES.push({ id: `${t}.${k}`, t, k, parent: k ? `${t}.${(k - 1) >> 1}` : null, cost: TC[t] * TR[t] ** k, fx, name });
}
const NODE = {}; NODES.forEach(n => NODE[n.id] = n);
const SORTED = NODES.slice().sort((a, b) => a.cost - b.cost);

/* ---------- State ---------- */
const fresh = () => ({ dust: 10, c: Array(7).fill(0), e: [10, 0, 0, 0, 0, 0, 0], en: Array(7).fill(0), lv: LAY.map(() => [0, 0, 0]),
  times: Array(7).fill(0), nodes: [], autoOn: true, anim: Array(7).fill(false), end: false, time: 0, last: Date.now() });
let S = fresh(), FX, MUL = 1, OWN = new Set(), slow = 0;
const Q = [];
function recalc() {
  OWN = new Set(S.nodes);
  const f = { dust: 1, gain: Array(7).fill(1), all: 1, autoBuy: false, auto: Array(7).fill(false) };
  S.nodes.forEach(id => { const n = NODE[id]; n.fx.forEach(([t, v]) => {
    if (t === 'dust') f.dust *= v; else if (t === 'all') f.all *= v; else if (t === 'autoBuy') f.autoBuy = true;
    else if (t === 'gain') { if (n.t === 6) f.dust *= v; else f.gain[n.t + 1] *= v; } }); });
  FX = f; let m = f.dust * f.all;
  for (let i = 1; i < 7; i++) m *= (1 + soft(S.c[i])) ** BOOST[i] * 1.25 ** S.lv[i][0];
  MUL = Math.min(m < SOFT ? m : SOFT * (m / SOFT) ** .6, DUST_CAP);   // base production is 1/s; above 1M/s it is soft-capped
}
/* Currency boosts are soft-capped above 1,000 so late numbers cannot run away. */
const soft = c => c < 1000 ? c : 1000 * (c / 1000) ** .3;
const boostOf = i => (1 + soft(S.c[i])) ** BOOST[i] * 1.25 ** S.lv[i][0];
const enRate = i => S.c[i] * EN_RATE * 1.3 ** S.lv[i][2];
const buyCost = (i, b) => BUY[b].b * BUY[b].r ** S.lv[i][b] * BSCALE ** (i - 1);
const gainOf = i => S.e[i - 1] < REQ[i] / (GS[i] * GS[i]) ? 0 : Math.sqrt(S.e[i - 1] / REQ[i]) * GS[i] * FX.gain[i] * (1 + .2 * S.lv[i][1]);   // smooth, not whole numbers
const cur = t => t ? S.c[t] : S.dust;
const canBuy = n => !OWN.has(n.id) && (!n.parent || OWN.has(n.parent)) && cur(n.t) >= n.cost;
const tabUnlocked = l => l === 0 || S.times[l] > 0 || ((l === 1 || S.times[l - 1] > 0) && S.e[l - 1] >= REQ[l] * .25);
function buy(id) { const n = NODE[id]; if (!n || !canBuy(n)) return false; if (n.t) S.c[n.t] -= n.cost; else S.dust -= n.cost; S.nodes.push(id); recalc(); return true; }
function buyAll(tree) {                      // cheapest first, optionally one tree only
  let any = false;
  for (;;) { let hit = null; for (const n of SORTED) if ((tree === undefined || n.t === tree) && tabUnlocked(n.t) && canBuy(n)) { hit = n; break; } if (!hit || !buy(hit.id)) break; any = true; }
  return any;
}
function buyBuyable(i, b) { const c = buyCost(i, b); if (S.en[i] < c) return false; S.en[i] -= c; S.lv[i][b]++; recalc(); return true; }
function reset(i) {
  const g = gainOf(i); if (g < 1) return false;
  S.dust = 10; S.e[0] = 10;
  for (let j = 1; j < i; j++) { S.c[j] = 0; S.e[j] = 0; S.en[j] = 0; S.lv[j] = [0, 0, 0]; }
  S.nodes = S.nodes.filter(id => NODE[id].t >= i);
  S.c[i] += g; S.e[i] += g; S.times[i]++;
  const first = !S.anim[i]; S.anim[i] = true; recalc();
  Q.push(first ? ['first', i, g] : ['reset', i, g]); return true;
}
const autoOK = i => { const g = gainOf(i); return g >= 1 && (S.c[i] === 0 || g >= AUTO_F[i] * S.c[i]); };
function step(dt) {
  S.time += dt;
  const p = MUL * dt; S.dust = Math.min(S.dust + p, DUST_CAP); S.e[0] += p;
  for (let i = 1; i < 7; i++) if (S.c[i] > 0) S.en[i] += enRate(i) * dt;
  slow += dt;
  if (slow >= .25) {
    slow = 0;
    if (FX.autoBuy && S.autoOn) buyAll();
    if (!S.end && NODES.filter(n => n.t === 6).every(n => OWN.has(n.id))) { S.end = true; Q.push(['end']); }
  }
}
function simPlay() {                         // a sensible player, used by the balance simulator
  buyAll();
  for (let i = 1; i < 7; i++) if (S.c[i] > 0) { let hit; do { hit = false; for (let b = 0; b < 3; b++) if (buyBuyable(i, b)) { hit = true; break; } } while (hit); }
  for (let i = 6; i >= 1; i--) if (autoOK(i)) { reset(i); break; }   // the simulated player resets by hand; the game itself never resets for you
}

const num = (x, d = 0) => isFinite(+x) && +x >= 0 ? Math.min(+x, 1e300) : d;
function load(d) {
  d = d && typeof d === 'object' ? d : {}; const f = fresh(); S = f;
  S.dust = num(d.dust, 10); S.time = num(d.time);
  const arr = (k, def) => { S[k] = def.map((x, i) => Array.isArray(d[k]) ? num(d[k][i], x) : x); };
  arr('c', f.c); arr('e', f.e); arr('en', f.en); arr('times', f.times);
  S.lv = f.lv.map((x, i) => x.map((_, b) => Array.isArray(d.lv) && Array.isArray(d.lv[i]) ? Math.floor(num(d.lv[i][b])) : 0));
  S.anim = f.anim.map((x, i) => !!(Array.isArray(d.anim) && d.anim[i]) || S.times[i] > 0);
  S.nodes = (Array.isArray(d.nodes) ? d.nodes : []).filter((id, i, a) => NODE[id] && a.indexOf(id) === i);
  S.autoOn = d.autoOn !== false; S.end = !!d.end; S.last = num(d.last, Date.now());
  recalc();
}
function describe(n) {
  return n.fx.map(([t, v]) => t === 'dust' ? `Cosmic Dust ×${v}` : t === 'all' ? `Everything ×${v}` : t === 'gain' ? (n.t === 6 ? `Cosmic Dust ×${v}` : `${LAY[n.t + 1].n} gain ×${v}`)
    : 'Buys upgrades for you').join('. ');
}
recalc();
const Core = { fmt, LAY, NODES, NODE, REQ, BUYABLES, OFFLINE_MAX, Q, fresh, load, step, recalc, gainOf, buyCost, enRate, canBuy, buy, buyAll, buyBuyable, reset, tabUnlocked,
  simPlay, describe, boostOf, soft, get: () => S, rate: () => MUL, fx: () => FX, has: id => OWN.has(id), cur, autoOK };
if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
