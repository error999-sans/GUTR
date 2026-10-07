(() => {
'use strict';
const { FS, resolve } = PCFS;
const $ = s => document.querySelector(s);
const coarse = matchMedia('(pointer:coarse)').matches;
const DESK = ['/Games', '/Scrapped Games', '/Apps', '/Apps/Command_Execute', '/Documents'];
const wins = {}; let z = 10, count = 0;
const look = p => resolve([], p);
const iconOf = n => n.icon || (n.t === 'dir' ? '📁' : '📄');

/* ---------- windows ---------- */
function createWin(o) {
  if (o.key && wins[o.key]) { wins[o.key].focus(); return wins[o.key]; }
  const el = document.createElement('div'); el.className = 'win';
  const w = Math.min(o.w || 640, innerWidth - 16), h = Math.min(o.h || 420, innerHeight - 60), k = count++ % 8;
  el.style.cssText = `width:${w}px;height:${h}px;left:${Math.min(40 + k * 28, Math.max(0, innerWidth - w))}px;top:${24 + k * 28}px`;
  el.innerHTML = `<div class="tb"><span class="ti"></span><b></b><span class="sp"></span>
    <button data-a="min" aria-label="Minimize">–</button><button data-a="max" aria-label="Maximize">▢</button><button data-a="x" aria-label="Close">✕</button></div>`;
  const tb = el.firstChild, title = tb.querySelector('b');
  tb.querySelector('.ti').textContent = o.icon; title.textContent = o.title;
  el.appendChild(o.content); $('#wins').appendChild(el);
  const btn = document.createElement('button'); btn.className = 'task'; btn.textContent = o.icon + ' ' + o.title; $('#tasks').appendChild(btn);
  const win = { el, btn, title };
  win.focus = () => { el.classList.remove('min'); el.style.zIndex = ++z; Object.values(wins).forEach(x => x.btn.classList.toggle('on', x === win)); };
  const id = o.key || 'w' + count; wins[id] = win;
  el.addEventListener('pointerdown', win.focus, true);
  btn.onclick = () => { if (el.classList.contains('min') || !btn.classList.contains('on')) win.focus(); else { el.classList.add('min'); btn.classList.remove('on'); } };
  tb.addEventListener('click', e => {
    const a = e.target.closest('button') && e.target.closest('button').dataset.a;
    if (a === 'min') { el.classList.add('min'); btn.classList.remove('on'); }
    if (a === 'max') el.classList.toggle('max');
    if (a === 'x') { el.remove(); btn.remove(); delete wins[id]; }
  });
  tb.addEventListener('dblclick', e => { if (!e.target.closest('button')) el.classList.toggle('max'); });
  tb.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || el.classList.contains('max')) return;
    const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    tb.setPointerCapture(e.pointerId); document.body.classList.add('dragging');
    const mv = ev => { el.style.left = Math.max(80 - r.width, Math.min(innerWidth - 80, ev.clientX - dx)) + 'px'; el.style.top = Math.max(0, Math.min(innerHeight - 90, ev.clientY - dy)) + 'px'; };
    const up = () => { document.body.classList.remove('dragging'); tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); };
    tb.addEventListener('pointermove', mv); tb.addEventListener('pointerup', up);
  });
  win.focus(); return win;
}

/* ---------- opening things ---------- */
function open(path) {
  const r = look(path); if (!r) return;
  const n = r.node, name = r.path[r.path.length - 1];
  if (n.t === 'dir') return explorer(r.path);
  if (n.t === 'app') {
    const f = document.createElement('iframe'); f.src = n.url; f.title = n.title;
    f.allow = 'autoplay'; f.setAttribute('loading', 'lazy');
    const w = createWin({ title: n.title, icon: n.icon, w: n.w, h: n.h, content: f, key: 'app:' + path });
    if (n.max) w.el.classList.add('max');
    return w;
  }
  const pre = document.createElement('pre'); pre.className = 'txt'; pre.textContent = n.text;
  createWin({ title: name, icon: iconOf(n), w: 480, h: 300, content: pre });
}

function explorer(start) {
  let path = start, hist = [];
  const box = document.createElement('div'); box.className = 'exp';
  box.innerHTML = `<div class="bar"><button data-b="back" aria-label="Back">←</button><button data-b="up" aria-label="Up one folder">↑</button><div class="addr"></div></div><div class="files"></div>`;
  const win = createWin({ title: 'Folder', icon: '📁', w: 560, h: 380, content: box });
  const files = box.querySelector('.files');
  const show = (p, push) => {
    if (push) hist.push(path); path = p;
    const node = look('/' + p.join('/')).node;
    box.querySelector('.addr').textContent = ['Main Menu', ...p].join(' › ');
    win.title.textContent = p[p.length - 1] || 'Main Menu';
    win.btn.textContent = '📁 ' + (p[p.length - 1] || 'Main Menu');
    files.innerHTML = '';
    const entries = Object.entries(node.c);
    if (!entries.length) files.innerHTML = '<div class="empty">This folder is empty.</div>';
    entries.forEach(([name, n]) => {
      const b = document.createElement('button'); b.className = 'it';
      b.innerHTML = `<span>${iconOf(n)}</span><small></small>`; b.querySelector('small').textContent = name;
      const go = () => n.t === 'dir' ? show([...p, name], true) : open('/' + [...p, name].join('/'));
      b.onclick = go; files.appendChild(b);
    });
  };
  box.querySelector('[data-b=back]').onclick = () => { if (hist.length) show(hist.pop(), false); };
  box.querySelector('[data-b=up]').onclick = () => { if (path.length) show(path.slice(0, -1), true); };
  show(path, false);
}

/* ---------- desktop icons, start menu, clock ---------- */
DESK.forEach(p => {
  const r = look(p), name = r.path[r.path.length - 1];
  const b = document.createElement('button'); b.className = 'icon';
  b.innerHTML = `<span>${iconOf(r.node)}</span><small></small>`; b.querySelector('small').textContent = name;
  b.onclick = () => open(p);
  $('#desktop').appendChild(b);
});
$('#desktop').onclick = () => document.querySelectorAll('.icon.sel').forEach(x => x.classList.remove('sel'));

const menu = $('#menu');
[['/', '🖥️', 'Main Menu'], ...DESK.map(p => { const r = look(p); return [p, iconOf(r.node), r.path[r.path.length - 1]]; })].forEach(([p, i, n]) => {
  const b = document.createElement('button'); b.textContent = i + '  ' + n.replace('_', '_');
  b.onclick = () => { menu.hidden = true; p === '/' ? explorer([]) : open(p); }; menu.appendChild(b);
});
$('#start').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
document.addEventListener('pointerdown', e => { if (!e.target.closest('#menu,#start')) menu.hidden = true; });
const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
tick(); setInterval(tick, 15000);

/* Apps (like the terminal) can ask the desktop to open something. */
addEventListener('message', e => { if (e.data && e.data.type === 'open' && typeof e.data.path === 'string') open(e.data.path); });
})();
