/* Galaxy Tree: core logic (no DOM; simulated in Node for balance). */
(function (root) {
'use strict';
/* ---------- Big numbers {m, e} ---------- */
const Z = { m: 0, e: 0 };
const norm = (m, e) => { if (!(m > 0) || !isFinite(m) || !isFinite(e)) return Z; const k = Math.floor(Math.log10(m)); return { m: m / 10 ** k, e: e + k }; };
const num = x => norm(x, 0);
const fromLog = l => { if (!isFinite(l)) return Z; const e = Math.floor(l); return { m: 10 ** (l - e), e }; };
const lg = a => a.m > 0 ? Math.log10(a.m) + a.e : -Infinity;
const mul = (a, b) => a.m && b.m ? norm(a.m * b.m, a.e + b.e) : Z;
const add = (a, b) => { if (!a.m) return b; if (!b.m) return a; if (a.e < b.e) [a, b] = [b, a]; const d = a.e - b.e; return d > 16 ? a : norm(a.m + b.m * 10 ** -d, a.e); };
const sub = (a, b) => { if (!b.m) return a; const d = a.e - b.e; return d > 16 ? a : norm(a.m - b.m * 10 ** -d, a.e); };
const cmp = (a, b) => !a.m || !b.m ? Math.sign(a.m - b.m) : a.e !== b.e ? Math.sign(a.e - b.e) : Math.sign(a.m - b.m);
const floorD = a => a.e > 15 ? a : num(Math.floor(a.m * 10 ** a.e + 1e-9));
const okD = x => x && typeof x.m === 'number' && typeof x.e === 'number' && isFinite(x.m) && isFinite(x.e) && x.m > 0 ? norm(x.m, x.e) : Z;
function fmt(a) {
  if (!a.m) return '0';
  if (a.e < 6) return (a.m * 10 ** a.e).toLocaleString('en-US', { maximumFractionDigits: a.e < 2 ? 2 : 0 });
  let m = a.m.toFixed(2), e = a.e; if (m === '10.00') { m = '1.00'; e++; }
  if (e < 1e6) return m + 'e' + e.toLocaleString('en-US');
  const x = Math.floor(Math.log10(e)); return m + 'e' + (e / 10 ** x).toFixed(2) + 'e' + x;
}
const ONE = num(1);

/* ---------- Config: balance lives here ---------- */
const LAY = [
  { n: 'Cosmic Dust', s: 'Dust', col: '#9fb4ff' },
  { n: 'Stars',       s: 'Stars', verb: 'Condense', col: '#ffe082' },
  { n: 'Nebulae',     s: 'Nebulae', verb: 'Expand', col: '#f48fb1' },
  { n: 'Pulsars',     s: 'Pulsars', verb: 'Spin up', col: '#80deea' },
  { n: 'Black Holes', s: 'Holes', verb: 'Collapse', col: '#b39ddb' },
  { n: 'Quasars',     s: 'Quasars', verb: 'Ignite', col: '#ffab91' },
  { n: 'Galaxies',    s: 'Galaxies', verb: 'Birth', col: '#a5d6a7' },
];
const NODES_PER_TREE = 15;
const REQ = [0, 12, 5, 6.5, 7.5, 8.5, 9.5];            // log10 of the previous currency earned this run
const GEXP = [0, .5, .5, .5, .5, .5, .5];           // gain = 10^((log10(prev) - REQ) * GEXP)
const BOOST = [0, .8, 1, 1.2, 1.5, 1.8, 2.2];           // dust x (1 + currency)^BOOST
const TC = [1, 0, 0, 0, 0, 0, 0];                   // log10 cost of each tree's first node
const TR = [.65, .8, .9, 1, 1.1, 1.2, 1.3];     // log10 cost ratio per node
const TM = [4, 6, 8, 10, 12, 14, 16];                // dust multiplier of a tree's dust nodes
const GAINM = 2, ALLM = 1.5;
const AUTO_F = 10;                                  // auto-reset when gain >= 10x your stock
const GOAL_LOG = 300;                               // reach 1e300 Cosmic Dust: the Galaxy is complete
const OFFLINE_MAX = 12 * 3600;

/* Tree t is a binary tree of 15 nodes. Every node multiplies dust; some add extras. k=6 is automation. */
const NODES = [];
for (let t = 0; t < 7; t++) for (let k = 0; k < NODES_PER_TREE; k++) {
  const fx = [['dust', TM[t]]]; let name = 'Dust Well';
  if (k === 6 && t >= 1) { fx.push(t === 1 ? ['autoBuy'] : ['autoReset', t - 1]); name = t === 1 ? 'Auto-Builder' : 'Auto-' + LAY[t - 1].verb; }
  else if (k % 3 === 1) { fx.push(['gain', GAINM]); name = 'Gravity Lens'; }
  else if (k % 3 === 2) { fx.push(['all', ALLM]); name = 'Resonance'; }
  NODES.push({ id: `${t}.${k}`, t, k, parent: k ? `${t}.${(k - 1) >> 1}` : null, cl: TC[t] + k * TR[t], cost: fromLog(TC[t] + k * TR[t]), fx, name });
}
const NODE = {}; NODES.forEach(n => NODE[n.id] = n);
const nodeCost = n => n.cost;
const SORTED = NODES.slice().sort((a, b) => a.cl - b.cl);   // cheapest first, computed once

/* ---------- State ---------- */
const fresh = () => ({ dust: num(10), c: LAY.map(() => Z), e: LAY.map((_, i) => i ? Z : num(10)), times: LAY.map(() => 0),
  nodes: [], autoOn: true, resetOn: LAY.map(() => true), end: false, time: 0, last: Date.now() });
let S = fresh(), FX, RATE = Z, OWN = new Set(), slow = 0;
const Q = [];
function recalc() {
  OWN = new Set(S.nodes);
  const f = { dust: 1, gain: LAY.map(() => 1), all: 1, autoBuy: false, auto: LAY.map(() => false) };
  S.nodes.forEach(id => { const n = NODE[id]; n.fx.forEach(([t, v]) => {
    if (t === 'dust') f.dust *= v; else if (t === 'all') f.all *= v; else if (t === 'autoBuy') f.autoBuy = true;
    else if (t === 'autoReset') f.auto[v] = true;
    else if (t === 'gain') { if (n.t === 6) f.dust *= v; else f.gain[n.t + 1] *= v; } }); });
  FX = f;
  let l = Math.log10(f.dust) + Math.log10(f.all);
  for (let i = 1; i < 7; i++) if (S.c[i].m) l += BOOST[i] * lg(add(S.c[i], ONE));
  RATE = fromLog(l);   // dust per second (base production is 1/s)
}
const gainOf = i => { const l = lg(S.e[i - 1]); return l < REQ[i] - 1e-9 ? Z : floorD(mul(fromLog((l - REQ[i]) * GEXP[i]), num(FX.gain[i]))); };
const canBuy = n => !OWN.has(n.id) && (!n.parent || OWN.has(n.parent)) && cmp(n.t ? S.c[n.t] : S.dust, nodeCost(n)) >= 0;
function buy(id) {
  const n = NODE[id]; if (!n || !canBuy(n)) return false;
  if (n.t) S.c[n.t] = sub(S.c[n.t], nodeCost(n)); else S.dust = sub(S.dust, nodeCost(n));
  S.nodes.push(id); recalc(); return true;
}
const unlockedTree = t => t === 0 || S.times[t] > 0 || S.c[t].m > 0 || lg(S.e[t - 1]) >= REQ[t] - 1.5;
const unlocked = () => [0, 1, 2, 3, 4, 5, 6].map(unlockedTree);
function buyAll() {                         // cheapest first; trees are checked once, not once per node
  const u = unlocked(); let any = false;
  for (;;) { let hit = null; for (const n of SORTED) if (u[n.t] && canBuy(n)) { hit = n; break; } if (!hit || !buy(hit.id)) break; any = true; }
  return any;
}
function reset(i) {
  const g = gainOf(i); if (!g.m) return false;
  S.dust = num(10); S.e[0] = num(10);
  for (let j = 1; j < i; j++) { S.c[j] = Z; S.e[j] = Z; }
  S.nodes = S.nodes.filter(id => NODE[id].t >= i);
  S.c[i] = add(S.c[i], g); S.e[i] = add(S.e[i], g); S.times[i]++;
  recalc(); Q.push(['reset', i]); return true;
}
const autoOK = i => { const g = gainOf(i); return g.m && (cmp(g, mul(S.c[i], num(AUTO_F))) >= 0 || !S.c[i].m); };
function step(dt) {
  S.time += dt;
  const p = mul(RATE, num(dt)); S.dust = add(S.dust, p); S.e[0] = add(S.e[0], p);
  slow += dt;
  if (slow >= .25) {                        // automation and goal checks run 4x per second, not every tick
    slow = 0;
    if (FX.autoBuy && S.autoOn) buyAll();
    for (let i = 6; i >= 1; i--) if (FX.auto[i] && S.resetOn[i] && autoOK(i)) { reset(i); break; }
    if (!S.end && lg(S.dust) >= GOAL_LOG) { S.end = true; Q.push(['end']); }
  }
}
function simPlay() { buyAll(); for (let i = 6; i >= 1; i--) if (!FX.auto[i] && autoOK(i)) { reset(i); break; } }

function load(d) {
  const f = fresh(); d = d && typeof d === 'object' ? d : {}; S = Object.assign(fresh(), d);
  S.dust = okD(S.dust); if (!(d.dust && isFinite(d.dust.m) && isFinite(d.dust.e))) S.dust = num(10);
  S.c = f.c.map((x, i) => Array.isArray(d.c) ? okD(d.c[i]) : x); S.e = f.e.map((x, i) => Array.isArray(d.e) ? okD(d.e[i]) : x); if (!S.e[0].m) S.e[0] = S.dust.m ? S.dust : num(10);
  S.times = f.times.map((x, i) => Math.max(0, +(Array.isArray(d.times) && d.times[i]) || 0));
  S.resetOn = f.resetOn.map((x, i) => Array.isArray(d.resetOn) && d.resetOn[i] !== undefined ? !!d.resetOn[i] : x);
  S.nodes = (Array.isArray(S.nodes) ? S.nodes : []).filter((id, i, a) => NODE[id] && a.indexOf(id) === i);
  S.time = +S.time || 0; recalc();
}
function describe(n) {
  return n.fx.map(([t, v]) => t === 'dust' ? `Cosmic Dust ×${v}` : t === 'all' ? `All production ×${v}` : t === 'gain' ? (n.t === 6 ? `Cosmic Dust ×${v}` : `${LAY[n.t + 1].n} gain ×${v}`)
    : t === 'autoBuy' ? 'Buys every upgrade you can afford' : `Auto-${LAY[v].verb.toLowerCase()} ${LAY[v].n}`).join('. ');
}
recalc();
const Core = { Z, ONE, num, fromLog, lg, mul, add, sub, cmp, fmt, LAY, NODES, NODE, REQ, GOAL_LOG, OFFLINE_MAX, Q, nodeCost, canBuy, buy, buyAll, unlockedTree, unlocked, has: id => OWN.has(id),
  gainOf, reset, step, simPlay, load, fresh, describe, get: () => S, rate: () => RATE, fx: () => FX, recalc };
if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
