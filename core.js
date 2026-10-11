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

/* ---------- The layers (names, currencies and energy currencies match each other) ---------- */
const LAY = [
  { n: 'Cosmic Dust', s: 'CD', ico: '❖', col: '#9fb4ff' },
  { n: 'Stars',             s: 'Stars',      verb: 'Stellarify',        en: 'Starlight',  ico: '★', col: '#ffe082', tag: 'Gather your dust into burning stars.' },
  { n: 'Supernova',         s: 'Novae',      verb: 'Supernova',         en: 'Shockwaves', ico: '✹', col: '#ff8a80', tag: 'A dying star outshines everything.' },
  { n: 'Black Hole',        s: 'Holes',      verb: 'Black Hole',        en: 'Accretion',  ico: '◉', col: '#b39ddb', tag: 'Gravity folds everything inward.' },
  { n: 'Radiate',           s: 'Radiation',  verb: 'Radiate',           en: 'Photons',    ico: '☼', col: '#fff176', tag: 'Hawking glow leaks out of the dark.' },
  { n: 'Collapse',          s: 'Collapsars', verb: 'Collapse',          en: 'Gravitons',  ico: '▼', col: '#90a4ae', tag: 'Cores give way and fall inward.' },
  { n: 'Hypernova',         s: 'Hypernovae', verb: 'Hypernova',         en: 'Gamma Rays', ico: '✺', col: '#ff5252', tag: 'A supernova\'s far angrier cousin.' },
  { n: 'Annihilate',        s: 'Antimatter', verb: 'Annihilate',        en: 'Positrons',  ico: '⚛', col: '#f06292', tag: 'Matter meets antimatter and vanishes.' },
  { n: 'Big Bang',          s: 'Bangs',      verb: 'Big Bang',          en: 'Inflation',  ico: '✦', col: '#ffb74d', tag: 'Everything begins again, in an instant.' },
  { n: 'Universal Bang',    s: 'U-Bangs',    verb: 'Universal Bang',    en: 'Spacetime',  ico: '✧', col: '#4dd0e1', tag: 'A bang big enough to hold a universe.' },
  { n: 'Multiverseal Bang', s: 'M-Bangs',    verb: 'Multiverseal Bang', en: 'Branes',     ico: '❂', col: '#ba68c8', tag: 'Countless universes bang into being.' },
  { n: 'Big Crunch',        s: 'Crunches',   verb: 'Big Crunch',        en: 'Entropy',    ico: '◍', col: '#cfd8dc', tag: 'Everything falls back into a single point.' },
];
const NL = LAY.length;   // dust + 11 reset layers

/* ---------- Config: balance lives here ---------- */
const REQ = [0, 10000000, 860, 100, 400, 73, 23, 140, 73, 42, 850, 220];   // earned amount of the previous currency needed for each reset (calibrated by simulation)
const GS = [0, 1, 1, 1, 2, 4, 4, 4, 4, 4, 4, 4];                       // gain scale per layer
const TC = [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];                      // first node cost of each tree
const TR = [2.4, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9];   // cost ratio per node
const TM = [3, 2.4, 2.2, 2, 1.9, 1.8, 1.7, 1.65, 1.6, 1.55, 1.5, 1.5];     // strength of each tree's dust upgrades
const TR2 = [2.4, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6];   // cost ratio of the second half of each tree (nodes 15-30)
const GAINM = 2, ALLM = 1.6;
const BOOST = [0, .25, .3, .35, .4, .45, .5, .55, .6, .65, .7, .75];  // dust x (1 + currency)^BOOST
const EN_RATE = .2, BSCALE = 3, SOFT = 1e6;
const BUY_COST = [{ b: 10, r: 1.6 }, { b: 50, r: 1.9 }, { b: 100, r: 1.7 }];
const AUTO_F = [0, 3, 3, 3, 2.5, 2, 2, 2, 2, 2, 2, 2], OFFLINE_MAX = 12 * 3600, DUST_CAP = 1e300;

/* ---------- Energy upgrades: a pool of 8 different effects; every layer gets its own set of 3 ---------- */
const BPOOL = [
  { n: 'Amplifier',   d: 'Cosmic Dust ×1.25 per level',                 fx: (f, v) => { f.dust *= 1.25 ** v; } },
  { n: 'Gravity lens', d: 'This layer\'s reset gain +20% per level',    fx: (f, v, l) => { f.gain[l] *= 1 + .2 * v; } },
  { n: 'Engine',      d: 'This layer\'s energy ×1.3 per level',         fx: (f, v, l) => { f.energy[l] *= 1.3 ** v; } },
  { n: 'Resonator',   d: 'Everything ×1.08 per level',                  fx: (f, v) => { f.all *= 1.08 ** v; } },
  { n: 'Relay',       d: 'Previous layer\'s reset gain +15% per level', fx: (f, v, l) => { if (l > 1) f.gain[l - 1] *= 1 + .15 * v; else f.dust *= 1 + .1 * v; } },
  { n: 'Compressor',  d: 'This layer\'s dust boost ×1.04 per level',    fx: (f, v, l) => { f.cb[l] *= 1.04 ** v; } },
  { n: 'Dynamo',      d: 'Dust ×1.15 and energy ×1.1 per level',        fx: (f, v, l) => { f.dust *= 1.15 ** v; f.energy[l] *= 1.1 ** v; } },
  { n: 'Catalyst',    d: 'Every layer\'s reset gain +6% per level',     fx: (f, v) => { for (let i = 1; i < NL; i++) f.gain[i] *= 1 + .06 * v; } },
];
const bidx = (l, j) => (l * 3 + j) % 8;
const buyInfo = (l, j) => BPOOL[bidx(l, j)];
/* ---------- Milestones (lifetime resets of a layer): each layer gets a different set of rewards ---------- */
const MSP = [
  ['Cosmic Dust ×1.3',            f => { f.dust *= 1.3; }],
  ['Energy ×2',                   (f, l) => { f.energy[l] *= 2; }],
  ['Reset gain ×1.25',            (f, l) => { f.gain[l] *= 1.25; }],
  ['Everything ×1.1',             f => { f.all *= 1.1; }],
  ['Previous layer gain ×1.3',    (f, l) => { if (l > 1) f.gain[l - 1] *= 1.3; else f.dust *= 1.15; }],
];
const MS_AT = [3, 10, 30];
const msOf = l => MS_AT.map((n, i) => [n, MSP[(l + i * 2) % 5][0], MSP[(l + i * 2) % 5][1]]);

/* ---------- Trees: 15 nodes each. No tree repeats a kind of upgrade (except the Dust tree, which has fewer kinds to use).
   The three deepest nodes of every layer's tree improve that layer's own unique feature. ---------- */
const VOCAB = [['Cosmic', 'Stellar', 'Drifting', 'Silent', 'Ancient'], ['Hydrogen', 'Helium', 'Carbon', 'Iron', 'Neutron'], ['Ejecta', 'Blast', 'Shock', 'Remnant', 'Flash'],
  ['Horizon', 'Singular', 'Photon', 'Ergo', 'Tidal'], ['Gamma', 'Ultraviolet', 'Infrared', 'Hawking', 'Thermal'], ['Core', 'Shell', 'Implosion', 'Degenerate', 'Critical'],
  ['Burst', 'Jet', 'Afterglow', 'Collapsar', 'Beam'], ['Positron', 'Quark', 'Lepton', 'Boson', 'Gluon'], ['Plasma', 'Inflaton', 'Quantum', 'Nucleo', 'Primal'],
  ['Brane', 'Metric', 'Vacuum', 'Fabric', 'Curvature'], ['Parallel', 'Branch', 'Echo', 'Mirror', 'Twin'], ['Entropy', 'Final', 'Reverse', 'Omega', 'Terminal']];
const KN = { apex: 'Apex', tide: 'Tide', surplus: 'Surplus', thrift: 'Thrift', chorus: 'Chorus', yield: 'Harvest', dust: 'Forge', gain: 'Lens', all: 'Harmony', link: 'Link', synergy: 'Lattice', energy: 'Engine', veteran: 'Memory', patience: 'Patience', relay: 'Relay', compound: 'Interest' };
/* Strength of each kind of upgrade at tier 1 / 2 / 3. Later tiers are bigger versions that sit deeper in the tree. */
const CO = { link: [.5, .55, .6], synergy: [.08, .09, .1], veteran: [.02, .022, .025], patience: [1200, 1200, 1200], relay: [.3, .33, .36], compound: [.1, .11, .12], chorus: [.05, .055, .06],
  energy: [2, 2.2, 2.4], apex: [.01, .012, .014], tide: [.25, .28, .31], surplus: [.12, .14, .16], thrift: [.8, .78, .75] };
const VCAP = [1, 1.1, 1.2], PCAP = [1800, 2000, 2200];
const BASE12 = ['dust', 'gain', 'all', 'link', 'synergy', 'energy', 'veteran', 'patience', 'relay', 'compound', 'chorus', 'yield'];
const rot = (a, n) => a.slice(n % a.length).concat(a.slice(0, n % a.length));
/* The Dust tree has no layer of its own, so it uses a hand-picked list of [kind, tier]; every pair is different. */
const TREE0 = [['dust', 1], ['gain', 1], ['all', 1], ['link', 1], ['synergy', 1], ['veteran', 1], ['patience', 1], ['relay', 1], ['compound', 1], ['chorus', 1], ['dust', 2], ['gain', 2], ['all', 2], ['synergy', 2], ['link', 2],
  ['veteran', 2], ['patience', 2], ['relay', 2], ['compound', 2], ['chorus', 2], ['apex', 1], ['surplus', 1], ['dust', 3], ['all', 3], ['link', 3], ['synergy', 3], ['veteran', 3], ['relay', 3], ['compound', 3], ['chorus', 3], ['apex', 2]];
function spec(t, kind, tier) {   // [value, description]
  const r = x => Math.round(x * 100) / 100, c = (CO[kind] || [])[tier - 1], src = t ? LAY[t].s : 'dust earned this run';
  switch (kind) {
    case 'dust': { const v = TM[t] ** (3 + .12 * (tier - 1)); return [v, `Cosmic Dust ×${r(v)}`]; }
    case 'gain': { const v = GAINM ** (1 + .08 * (tier - 1)); return [v, t === NL - 1 ? `Cosmic Dust ×${r(v)}` : `${LAY[t + 1].n} reset gain ×${r(v)}`]; }
    case 'all': { const v = ALLM ** (1 + .08 * (tier - 1)); return [v, `Everything ×${r(v)}`]; }
    case 'yield': { const v = GAINM ** (1 + .08 * (tier - 1)); return [v, `${LAY[t].n} reset gain ×${r(v)}`]; }
    case 'link': return [0, `Dust ×(1 + ${c} × log₁₀ of your ${src})`];
    case 'synergy': return [0, `Dust +${r(c * 100)}% per upgrade owned in this tree`];
    case 'veteran': return [0, `Dust +${r(c * 100)}% per lifetime reset of this layer`];
    case 'patience': return [0, `Dust grows the longer you go without resetting`];
    case 'relay': return [0, t <= 1 ? `Dust ×(1 + ${r(c * .33)} × log₁₀ of dust earned)` : `Dust ×(1 + ${c} × log₁₀ of your ${LAY[t - 1].s})`];
    case 'compound': return [0, `Dust ×(1 + ${c} × log₁₀ of the dust you hold)`];
    case 'chorus': return [0, `Dust +${r(c * 100)}% for every layer you have unlocked`];
    case 'energy': return [c, `${LAY[t].en} ×${c}`];
    case 'apex': return [0, `Dust +${r(c * 100)}% per upgrade owned in any tree`];
    case 'tide': return [0, `${LAY[t].en} boosted by your ${LAY[t].s}`];
    case 'surplus': return [0, `${t ? LAY[t].n : LAY[1].n} reset gain boosted by the dust you hold`];
    case 'thrift': return [c, `${LAY[t].en} upgrades cost ×${c}`];
  }
}

/* ---------- Unique features: one completely different mechanic per reset layer ---------- */
let S, FX, MUL = 1, OWN = new Set(), slow = 0;
const Q = [];
const up = (l, i) => OWN.has(l + '.' + (12 + i));
const CON = [['Hunter', 'Dust +60%'], ['Swan', 'Reset gains +40%'], ['Lyre', 'Energy +50%'], ['Crown', 'Everything +25%']];
const prismPts = () => Math.floor(Math.log2(1 + S.c[4]) * (up(4, 2) ? 1.5 : 1)) + (up(4, 0) ? 3 : 0);
const clampPrism = s => { const p = prismPts(); while (s.r + s.g + s.b > p) { const k = s.r >= s.g && s.r >= s.b ? 'r' : s.g >= s.b ? 'g' : 'b'; s[k]--; } };
const rollSeed = () => { const lo = up(9, 1) ? 1.3 : 1, g = () => lo * (2.5 / lo) ** Math.random(), a = [g(), g(), g()]; if (!up(9, 2)) return a; const b = [g(), g(), g()]; return a[0] + a[1] + a[2] >= b[0] + b[1] + b[2] ? a : b; };
const bankCap = () => (up(11, 0) ? 96 : 48) * 3600;
const FEAT = [null,
  { n: 'Constellations', d: 'Light up constellations. Only some can shine at once, and you can switch freely.', init: () => ({ on: [] }),
    ups: [['Third slot', 'One more constellation can shine'], ['Bright stars', 'Constellation bonuses ×1.5'], ['Zenith', 'A fourth constellation can shine']],
    slots: () => 2 + (up(1, 0) ? 1 : 0) + (up(1, 2) ? 1 : 0),
    fx(f, s) { const k = up(1, 1) ? 1.5 : 1; s.on.slice(0, this.slots()).forEach(i => { if (i === 0) f.dust *= 1 + .6 * k; else if (i === 1) { for (let l = 1; l < NL; l++) f.gain[l] *= 1 + .4 * k; } else if (i === 2) { for (let l = 1; l < NL; l++) f.energy[l] *= 1 + .5 * k; } else f.all *= 1 + .25 * k; }); },
    info(s) { return `${Math.min(s.on.length, this.slots())} of ${this.slots()} constellations shining.`; },
    btns(s) { return CON.map((c, i) => ({ t: `${s.on.includes(i) ? '●' : '○'} ${c[0]}: ${c[1]}`, go() { const j = s.on.indexOf(i); if (j >= 0) s.on.splice(j, 1); else { s.on.push(i); while (s.on.length > FEAT[1].slots()) s.on.shift(); } recalc(); } })); } },
  { n: 'Detonation', d: 'A charge builds over time. Detonate it to boost your dust for a while.', init: () => ({ charge: 0, until: 0, mult: 1 }),
    ups: [['Fast fuse', 'Charges twice as fast'], ['Long burn', 'Lasts 60 seconds instead of 30'], ['Chain reaction', 'Much stronger boost per charge']],
    wipe(s) { s.charge = 0; s.until = 0; s.mult = 1; }, step(dt, s) { s.charge = Math.min(100, s.charge + dt * (100 / 180) * (up(2, 0) ? 2 : 1)); },
    fx(f, s) { if (S.time < s.until) f.dust *= s.mult; },
    info(s) { return `Charge ${s.charge.toFixed(0)}%. ` + (S.time < s.until ? `Active: dust ×${s.mult.toFixed(2)} for ${Math.ceil(s.until - S.time)}s.` : 'Needs at least 10% to detonate.'); },
    btns(s) { return [{ t: `Detonate (${s.charge.toFixed(0)}% charge)`, dis: s.charge < 10, go() { s.mult = 1 + s.charge * (up(2, 2) ? .07 : .03); s.until = S.time + (up(2, 1) ? 60 : 30); s.charge = 0; recalc(); } }]; } },
  { n: 'Event Horizon', d: 'Feed the black hole with your dust to grow its mass. Mass boosts all dust.', init: () => ({ mass: 0 }),
    ups: [['Dense core', 'Mass grows faster'], ['Hawking leak', 'Feeding costs 50% of your dust, not 90%'], ['Accretion disk', 'Mass boost ×1.5']],
    wipe(s) { s.mass = 0; }, fx(f, s) { f.dust *= 1 + (up(3, 2) ? .525 : .35) * Math.log10(1 + s.mass); },
    info(s) { return `Mass ${fmt(s.mass)}: dust ×${(1 + (up(3, 2) ? .525 : .35) * Math.log10(1 + s.mass)).toFixed(2)}.`; },
    btns(s) { const fr = up(3, 1) ? .5 : .9; return [{ t: `Feed it ${fr * 100}% of your dust`, dis: S.dust < 100, go() { const a = S.dust * fr; S.dust -= a; s.mass += a ** (up(3, 0) ? .3 : .25); recalc(); } }]; } },
  { n: 'Prism', d: 'Split radiation into three bands. Spend points freely and move them any time.', init: () => ({ r: 0, g: 0, b: 0 }),
    ups: [['Wider spectrum', '+3 prism points'], ['Lens coating', 'Every band is 1.5× stronger'], ['Refraction', '+50% prism points']],
    fx(f, s) { clampPrism(s); const k = up(4, 1) ? 1.5 : 1; f.dust *= 1 + .12 * k * s.r; for (let l = 1; l < NL; l++) { f.gain[l] *= 1 + .06 * k * s.g; f.energy[l] *= 1 + .15 * k * s.b; } },
    info(s) { const k = up(4, 1) ? 1.5 : 1; return `${prismPts() - s.r - s.g - s.b} free of ${prismPts()} points. Dust +${(12 * k * s.r).toFixed(0)}%, gains +${(6 * k * s.g).toFixed(0)}%, energy +${(15 * k * s.b).toFixed(0)}%.`; },
    btns(s) { const free = prismPts() - s.r - s.g - s.b; return [['r', 'Red dust'], ['g', 'Green gains'], ['b', 'Blue energy']].flatMap(([k, n]) => [{ t: `${n} −`, dis: s[k] < 1, go() { s[k]--; recalc(); } }, { t: `${n} + (${s[k]})`, dis: free < 1, go() { s[k]++; recalc(); } }]); } },
  { n: 'Chain Reaction', d: 'Every reset of Black Hole or higher adds to a combo. The combo boosts every reset gain and fades over time.', init: () => ({ combo: 0, t: 0 }),
    ups: [['Slow fuse', 'The combo fades half as fast'], ['Deep chain', 'The combo can reach 40, not 20'], ['Strong links', 'Each combo step adds more']],
    step(dt, s) { if (s.combo > 0 && S.time - s.t > (up(5, 0) ? 180 : 90)) { s.combo--; s.t = S.time; } },
    fx(f, s) { const m = 1 + (up(5, 2) ? .035 : .02) * s.combo; for (let l = 1; l < NL; l++) f.gain[l] *= m; },
    info(s) { return `Combo ${s.combo} of ${up(5, 1) ? 40 : 20}: every reset gain ×${(1 + (up(5, 2) ? .035 : .02) * s.combo).toFixed(2)}.`; }, btns: () => [] },
  { n: 'Gamma-Ray Bursts', d: 'Bursts appear now and then. Catch one before it fades for a pile of free dust.', init: () => ({ next: 0, until: 0, caught: 0 }),
    ups: [['Wide beam', 'Bursts last twice as long'], ['Rich burst', 'Bursts are worth twice as much dust'], ['Frequent bursts', 'Bursts appear twice as often']],
    step(dt, s) { const fi = up(6, 2) ? .5 : 1; if (!s.next) s.next = S.time + 60 * fi; if (S.time >= s.next && S.time >= s.until) { s.until = S.time + (up(6, 0) ? 40 : 20); s.next = s.until + (60 + Math.random() * 90) * fi; Q.push(['burst']); } },
    info(s) { return S.time < s.until ? `A burst is here! ${Math.ceil(s.until - S.time)}s left.` : `No burst right now. Caught so far: ${s.caught}.`; },
    btns(s) { return [{ t: 'Catch the burst!', dis: !(S.time < s.until), go() { const g = MUL * (up(6, 1) ? 90 : 45); S.dust = Math.min(S.dust + g, DUST_CAP); S.e[0] += g; s.until = 0; s.caught++; } }]; } },
  { n: 'Annihilation Field', d: 'While on, dust production is cut, but the first six layers give far bigger resets. Switch any time.', init: () => ({ on: false }),
    ups: [['Shielding', 'The field cuts dust less'], ['Strong field', 'Bigger reset gains while on'], ['Two-way field', 'Every layer\'s energy ×2 while on']],
    fx(f, s) { if (!s.on) return; f.dust *= up(7, 0) ? .7 : .5; for (let l = 1; l <= 6; l++) f.gain[l] *= up(7, 1) ? 5 : 3; if (up(7, 2)) for (let l = 1; l < NL; l++) f.energy[l] *= 2; },
    info(s) { return s.on ? `Field ON: dust ×${up(7, 0) ? .7 : .5}, reset gains of layers 1-6 ×${up(7, 1) ? 5 : 3}.` : 'Field off.'; },
    btns(s) { return [{ t: s.on ? 'Turn the field off' : 'Turn the field on', go() { s.on = !s.on; recalc(); } }]; } },
  { n: 'Expansion', d: 'Space keeps expanding. Everything grows stronger the longer you wait since your last Big Bang or higher reset.', init: () => ({ last: 0 }),
    ups: [['Fast inflation', 'Expansion grows twice as fast'], ['Long horizon', 'Expansion keeps growing for twice as long'], ['Afterglow', 'Keep 25% of the expansion after a reset']],
    age: s => Math.min(S.time - s.last, up(8, 1) ? 7200 : 3600), fx(f, s) { f.all *= 1 + this.age(s) / (up(8, 0) ? 300 : 600); },
    info(s) { return `Expansion: everything ×${(1 + this.age(s) / (up(8, 0) ? 300 : 600)).toFixed(2)} (${Math.floor(this.age(s) / 60)} minutes since your last Big Bang or higher).`; }, btns: () => [] },
  { n: 'Seeds', d: 'Your universe grows from a random seed. Reroll it with Spacetime until you like it.', init: () => ({ seed: [1.5, 1.5, 1.5], rerolls: 0 }),
    ups: [['Cheaper dice', 'Rerolls cost half'], ['Loaded dice', 'Seeds never roll below ×1.3'], ['Twin seeds', 'Each reroll rolls twice and keeps the better one']],
    cost: s => 20 * 1.5 ** s.rerolls * (up(9, 0) ? .5 : 1), fx(f, s) { f.dust *= s.seed[0]; for (let l = 1; l < NL; l++) { f.gain[l] *= s.seed[1]; f.energy[l] *= s.seed[2]; } },
    info(s) { return `Seed: dust ×${s.seed[0].toFixed(2)}, reset gains ×${s.seed[1].toFixed(2)}, energy ×${s.seed[2].toFixed(2)}.`; },
    btns(s) { const c = FEAT[9].cost(s); return [{ t: `Reroll the seed (${fmt(c)} Spacetime)`, dis: S.en[9] < c, go() { S.en[9] -= c; s.rerolls++; s.seed = rollSeed(); recalc(); } }]; } },
  { n: 'Echo', d: 'The multiverse remembers the strongest dust production it ever had, and echoes it back.', init: () => ({ peak: 0 }),
    ups: [['Louder echo', 'The echo is stronger'], ['Harmonics', 'The echo also boosts every reset gain'], ['Overtones', 'The echo also boosts every layer\'s energy']],
    wipe() {}, step(dt, s) { if (MUL > s.peak) s.peak = MUL; },
    fx(f, s) { const l = Math.log10(1 + s.peak); f.all *= 1 + (up(10, 0) ? .08 : .05) * l; if (up(10, 1)) for (let i = 1; i < NL; i++) f.gain[i] *= 1 + .02 * l; if (up(10, 2)) for (let i = 1; i < NL; i++) f.energy[i] *= 1 + .05 * l; },
    info(s) { return `Best production ever: ${fmt(s.peak)} dust per second. Echo: everything ×${(1 + (up(10, 0) ? .08 : .05) * Math.log10(1 + s.peak)).toFixed(2)}.`; }, btns: () => [] },
  { n: 'Chrono Bank', d: 'While you are away, time is banked. Spend the bank to run the game faster.', init: () => ({ bank: 0, warp: false }),
    ups: [['Bigger vault', 'The bank holds 96 hours instead of 48'], ['Faster warp', 'Time warp runs ×10 instead of ×5'], ['Efficient warp', 'Warping uses 30% less of the bank']],
    info(s) { return `Banked time: ${(s.bank / 3600).toFixed(1)} hours. Warp runs the game ×${up(11, 1) ? 10 : 5} while the bank lasts.`; },
    btns(s) { return [{ t: s.warp ? 'Time warp: ON (click to stop)' : 'Time warp: OFF (click to start)', go() { s.warp = !s.warp; } }]; } },
];

const NODES = [];
for (let t = 0; t < NL; t++) {
  const half1 = rot(BASE12, (t * 5) % 12), half2 = rot(BASE12, (t * 7 + 5) % 12);
  for (let k = 0; k < 31; k++) {
    let kind, tier = 1, name, desc, v = 0;
    if (t === 0) [kind, tier] = TREE0[k];
    else if (k < 12) kind = half1[k];
    else if (k < 15) kind = 'feat';
    else if (k < 27) { kind = half2[k - 15]; tier = 2; }
    else kind = ['apex', 'tide', 'surplus', 'thrift'][k - 27];
    if (kind === 'feat') { const u = FEAT_UPS(t)[k - 12]; name = u[0]; desc = u[1]; }
    else if (t >= 1 && k === 6) { kind = 'auto'; name = 'Auto-Builder'; desc = `Buys ${LAY[t].n} upgrades for you`; }
    else if (t === 1 && k === 7) { kind = 'autoDust'; name = 'Dust Auto-Builder'; desc = 'Buys Cosmic Dust upgrades for you'; }
    else {
      [v, desc] = spec(t, kind, tier);
      name = `${tier > 1 ? (tier > 2 ? 'Prime ' : 'Grand ') : ''}${VOCAB[t][k % 5]} ${KN[kind]}`; if (NODES.some(m => m.t === t && m.name === name)) name += ' II';
    }
    const cost = k < 15 ? TC[t] * TR[t] ** k : TC[t] * TR[t] ** 14 * TR2[t] ** (k - 14);
    NODES.push({ id: `${t}.${k}`, t, k, parent: k ? `${t}.${(k - 1) >> 1}` : null, cost, kind, tier, v, name, desc });
  }
}
function FEAT_UPS(t) { return FEAT[t].ups; }
const NODE = Object.create(null); NODES.forEach(n => NODE[n.id] = n);   // no prototype, so ids like "constructor" from a hostile save are rejected
const SORTED = NODES.slice().sort((a, b) => a.cost - b.cost);

/* ---------- State ---------- */
const fresh = () => ({ dust: 10, c: Array(NL).fill(0), e: [10, ...Array(NL - 1).fill(0)], en: Array(NL).fill(0), lv: LAY.map(() => [0, 0, 0]),
  times: Array(NL).fill(0), nodes: [], autoOn: Array(NL).fill(true), anim: Array(NL).fill(false), end: false, time: 0, lastReset: 0, last: Date.now(), feat: FEAT.map(F => F ? F.init() : null) });
S = fresh();
function recalc() {
  OWN = new Set(S.nodes);
  const f = { dust: 1, all: 1, gain: Array(NL).fill(1), energy: Array(NL).fill(1), cb: Array(NL).fill(1), thrift: Array(NL).fill(1), auto: Array(NL).fill(false) }, own = Array(NL).fill(0);
  S.nodes.forEach(id => own[NODE[id].t]++);
  S.nodes.forEach(id => {
    const n = NODE[id], t = n.t;
    const c = (CO[n.kind] || [])[n.tier - 1];
    switch (n.kind) {
      case 'dust': f.dust *= n.v; break;
      case 'all': f.all *= n.v; break;
      case 'gain': if (t === NL - 1) f.dust *= n.v; else f.gain[t + 1] *= n.v; break;
      case 'yield': f.gain[t] *= n.v; break;
      case 'energy': f.energy[t] *= n.v; break;
      case 'thrift': f.thrift[t] *= n.v; break;
      case 'auto': f.auto[t] = true; break;
      case 'autoDust': f.auto[0] = true; break;
      case 'link': f.dust *= t ? 1 + c * Math.log10(1 + S.c[t]) : 1 + c * .3 * Math.log10(1 + S.e[0]); break;
      case 'synergy': f.dust *= 1 + c * own[t]; break;
      case 'veteran': f.dust *= 1 + Math.min(VCAP[n.tier - 1], c * S.times[Math.max(t, 1)]); break;
      case 'patience': f.dust *= 1 + Math.min(S.time - S.lastReset, PCAP[n.tier - 1]) / c; break;
      case 'relay': f.dust *= t <= 1 ? 1 + c * .33 * Math.log10(1 + S.e[0]) : 1 + c * Math.log10(1 + S.c[t - 1]); break;
      case 'compound': f.dust *= 1 + c * Math.log10(1 + S.dust); break;
      case 'chorus': f.dust *= 1 + c * S.times.filter((x, i) => i > 0 && x > 0).length; break;
      case 'apex': f.dust *= 1 + Math.min(3, c * S.nodes.length); break;
      case 'tide': f.energy[t] *= 1 + c * Math.log10(1 + S.c[t]); break;
      case 'surplus': f.gain[t || 1] *= 1 + c * Math.log10(1 + S.dust); break;
    }
  });
  for (let l = 1; l < NL; l++) {
    msOf(l).forEach(([need, , fn]) => { if (S.times[l] >= need) fn(f, l); });
    for (let j = 0; j < 3; j++) if (S.lv[l][j]) BPOOL[bidx(l, j)].fx(f, S.lv[l][j], l);
    if (S.times[l] > 0) FEAT[l].fx && FEAT[l].fx(f, S.feat[l]);
  }
  FX = f; let m = f.dust * f.all;
  for (let i = 1; i < NL; i++) m *= (1 + soft(S.c[i])) ** BOOST[i] * f.cb[i];
  MUL = Math.min(capRate(m), DUST_CAP);   // base production is 1/s
}
/* Production curve. */
const A1 = SOFT * 1000 ** .6, A2 = A1 * 1000 ** .45;
const capRate = m => m < SOFT ? m : m < 1e9 ? SOFT * (m / SOFT) ** .6 : m < 1e12 ? A1 * (m / 1e9) ** .45 : A2 * (m / 1e12) ** .3;
/* Currency boost curve. */
const soft = c => c < 1000 ? c : 1000 * (c / 1000) ** .3;
const boostOf = i => (1 + soft(S.c[i])) ** BOOST[i] * FX.cb[i];
const enRate = i => S.c[i] * EN_RATE * FX.energy[i];
const buyCost = (i, b) => BUY_COST[b].b * BUY_COST[b].r ** S.lv[i][b] * BSCALE ** (i - 1) * FX.thrift[i];
const reqOf = i => REQ[i] / (GS[i] * GS[i]);   // the amount you actually need (a reset gives 1+ at exactly this)
const gainOf = i => S.e[i - 1] < reqOf(i) ? 0 : Math.sqrt(S.e[i - 1] / REQ[i]) * GS[i] * FX.gain[i];
const cur = t => t ? S.c[t] : S.dust;
const canBuy = n => !OWN.has(n.id) && (!n.parent || OWN.has(n.parent)) && cur(n.t) >= n.cost;
const tabUnlocked = l => l === 0 || S.times[l] > 0 || ((l === 1 || S.times[l - 1] > 0) && S.e[l - 1] >= reqOf(l) * .25);
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
  for (let j = 1; j < i; j++) { S.c[j] = 0; S.e[j] = 0; S.en[j] = 0; S.lv[j] = [0, 0, 0]; if (FEAT[j].wipe) FEAT[j].wipe(S.feat[j]); }
  S.nodes = S.nodes.filter(id => NODE[id].t >= i);
  S.c[i] += g; S.e[i] += g; S.times[i]++;
  if (i >= 3) { const s = S.feat[5]; s.combo = Math.min(up(5, 1) ? 40 : 20, s.combo + 1); s.t = S.time; }                                  // Chain Reaction
  if (i >= 8) { const s = S.feat[8]; s.last = S.time - (up(8, 2) ? .25 * Math.min(S.time - s.last, up(8, 1) ? 7200 : 3600) : 0); }       // Expansion
  S.lastReset = S.time;
  const first = !S.anim[i]; S.anim[i] = true; recalc();
  Q.push(first ? ['first', i, g] : ['reset', i, g]); return true;
}
const autoOK = i => {                         // the simulated player's rule: reset when the gain is big, or when it unlocks the next layer
  const g = gainOf(i); if (g < 1) return false;
  if (S.c[i] === 0 || g >= AUTO_F[i] * S.c[i]) return true;
  return i < NL - 1 && S.e[i] < reqOf(i + 1) && S.e[i] + g >= reqOf(i + 1);
};
function step(dt) {
  if (!(dt > 0)) return;                      // ignore zero, negative or NaN time (for example if the clock is changed)
  S.time += dt;
  const p = MUL * dt; S.dust = Math.min(S.dust + p, DUST_CAP); S.e[0] += p;
  for (let i = 1; i < NL; i++) { if (S.c[i] > 0) S.en[i] += enRate(i) * dt; if (S.times[i] > 0 && FEAT[i].step) FEAT[i].step(dt, S.feat[i]); }
  slow += dt;
  if (slow >= .25) {
    slow = 0; recalc();                       // keeps timed effects and the dust-earned link upgrade current
    for (let t = 0; t < NL; t++) if (FX.auto[t] && S.autoOn[t]) buyAll(t);   // each layer's Auto-Builder only buys that layer's own tree
    if (!S.end && S.times[NL - 1] > 0) { S.end = true; Q.push(['end']); }   // final layer reached
  }
}
/* Real-time tick: applies Chrono Bank time warp. Long gaps (sleeping tab, closed game) go through offline(). */
function advance(dt) {
  const s = S.feat[NL - 1];
  if (S.times[NL - 1] > 0 && s.warp && s.bank > 0) {
    const k = up(11, 1) ? 10 : 5, eff = up(11, 2) ? .7 : 1; let extra = dt * (k - 1); const cost = extra * eff;
    if (cost > s.bank) { extra = s.bank / eff; s.bank = 0; } else s.bank -= cost; step(dt + extra);
  } else step(dt);
}
function simulate(sec) { const n = Math.min(240, Math.ceil(sec / 10)); for (let i = 0; i < n; i++) step(sec / n); }
function offline(away) {
  away = Math.max(0, Math.min(away, OFFLINE_MAX)); if (!away) return;
  const s = S.feat[NL - 1];
  if (S.times[NL - 1] > 0) { const sim = Math.min(away, 600); simulate(sim); s.bank = Math.min(bankCap(), s.bank + (away - sim)); } else simulate(away);
}
function simPlay() {                         // a sensible player, used by the balance simulator
  const f = S.feat;                           // sensible default choices for every unique feature
  if (!f[1].on.length) f[1].on = [0, 1];
  if (S.times[2] > 0 && f[2].charge >= 99) FEAT[2].btns(f[2])[0].go();
  if (S.times[4] > 0 && !(f[4].r + f[4].g + f[4].b) && prismPts() > 0) { f[4].r = prismPts(); recalc(); }
  if (S.times[6] > 0 && S.time < f[6].until) FEAT[6].btns(f[6])[0].go();
  buyAll();
  for (let i = 1; i < NL; i++) if (S.c[i] > 0) { let hit; do { hit = false; for (let b = 0; b < 3; b++) if (buyBuyable(i, b)) { hit = true; break; } } while (hit); }
  for (let i = NL - 1; i >= 1; i--) if (autoOK(i)) { reset(i); break; }   // the simulated player resets by hand; the game itself never resets for you
}

const mix = (def, d) => {                    // copy a saved feature state onto its defaults, rejecting anything odd
  const o = JSON.parse(JSON.stringify(def)); if (!d || typeof d !== 'object') return o;
  for (const k in o) { const v = d[k];
    if (typeof o[k] === 'number') { if (isFinite(+v) && +v >= 0) o[k] = Math.min(+v, 1e300); }
    else if (typeof o[k] === 'boolean') { if (typeof v === 'boolean') o[k] = v; }
    else if (Array.isArray(o[k]) && Array.isArray(v)) o[k] = v.slice(0, 8).map(x => isFinite(+x) ? Math.min(Math.max(+x, 0), 1e6) : 0); }
  return o;
};
const num = (x, d = 0) => isFinite(+x) && +x >= 0 ? Math.min(+x, 1e300) : d;
function load(d) {
  d = d && typeof d === 'object' ? d : {}; const f = fresh(); S = f;
  S.dust = num(d.dust, 10); S.time = num(d.time); S.lastReset = Math.min(num(d.lastReset), S.time);
  const arr = (k, def) => { S[k] = def.map((x, i) => Array.isArray(d[k]) ? num(d[k][i], x) : x); };
  arr('c', f.c); arr('e', f.e); arr('en', f.en); arr('times', f.times);
  S.lv = f.lv.map((x, i) => x.map((_, b) => Array.isArray(d.lv) && Array.isArray(d.lv[i]) ? Math.floor(num(d.lv[i][b])) : 0));
  S.anim = f.anim.map((x, i) => !!(Array.isArray(d.anim) && d.anim[i]) || S.times[i] > 0);
  S.nodes = (Array.isArray(d.nodes) ? d.nodes : []).filter((id, i, a) => NODE[id] && a.indexOf(id) === i);
  S.feat = FEAT.map((F, l) => F ? mix(F.init(), Array.isArray(d.feat) ? d.feat[l] : null) : null);
  S.autoOn = f.autoOn.map((x, i) => Array.isArray(d.autoOn) ? d.autoOn[i] !== false : d.autoOn !== false); S.end = !!d.end; S.last = num(d.last, Date.now());
  recalc();
}
recalc();
const Core = { fmt, NL, LAY, NODES, NODE, REQ, FEAT, OFFLINE_MAX, Q, msOf, buyInfo, fresh, load, step, advance, offline, simulate, recalc, gainOf, reqOf, buyCost, enRate, boostOf, canBuy, buy, buyAll,
  buyBuyable, reset, tabUnlocked, simPlay, get: () => S, rate: () => MUL, fx: () => FX, has: id => OWN.has(id), cur, autoOK, describe: n => n.desc };
if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
