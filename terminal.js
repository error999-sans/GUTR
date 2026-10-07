(() => {
'use strict';
const $ = id => document.getElementById(id);
const out = $('out'), inp = $('in');
let cwd = [], hist = [], hi = 0;
const here = () => '/' + cwd.join('/');
const print = (t = '', c = '') => { const d = document.createElement('div'); d.className = c; d.textContent = t; out.appendChild(d); $('term').scrollTop = 1e9; };
const setPrompt = () => { $('pr').textContent = `user@main-menu:${here()}$`; };

function find(name, n = PCFS.FS, p = []) {
  const q = name.toLowerCase();
  for (const [k, v] of Object.entries(n.c || {})) {
    if (k.toLowerCase() === q || k.toLowerCase().replace(/\.[a-z]+$/, '') === q || (v.alias || []).includes(q)) return { node: v, path: [...p, k] };
    if (v.t === 'dir') { const r = find(name, v, [...p, k]); if (r) return r; }
  }
  return null;
}
const get = a => PCFS.resolve(cwd, a) || find(a);
const label = (k, n) => k + (n.t === 'dir' ? '/' : n.t === 'app' ? '*' : '');

const C = {
  help: () => print(`Commands:
  ls [path]       list a folder          cd [path]      change folder
  pwd             show current folder    cat <file>     show a text file
  open <name>     open an app or game    run <name>     same as open
  games           list games             calc <expr>    do maths, e.g. calc 2*(3+4)
  echo <text>     print text             date           show date and time
  whoami          who you are            history        previous commands
  theme <color>   green, amber, cyan or white
  neofetch        system info            clear          clear the screen
Tip: Up/Down arrows recall commands. * marks something you can open.`),
  ls: a => { const r = a[0] ? get(a[0]) : PCFS.resolve(cwd, '.'); if (!r) return print(`ls: ${a[0]}: no such folder`, 'err');
    if (r.node.t !== 'dir') return print(r.path[r.path.length - 1]);
    print(Object.entries(r.node.c).map(([k, n]) => label(k, n)).join('   ') || '(empty)'); },
  cd: a => { const r = a[0] ? PCFS.resolve(cwd, a[0]) : { node: PCFS.FS, path: [] };
    if (!r || r.node.t !== 'dir') return print(`cd: ${a[0]}: no such folder`, 'err'); cwd = r.path; setPrompt(); },
  pwd: () => print(here()),
  cat: a => { const r = a[0] && get(a[0]); if (!r || r.node.t !== 'txt') return print('cat: give me a text file, e.g. cat README.txt', 'err'); print(r.node.text); },
  open: a => { const r = a[0] && get(a.join(' '));
    if (!r) return print(a[0] ? `open: ${a.join(' ')}: not found` : 'usage: open <name>', 'err');
    if (parent === window) return print('Open this from the desktop to launch things.', 'err');
    parent.postMessage({ type: 'open', path: '/' + r.path.join('/') }, '*'); print('Opening ' + r.path[r.path.length - 1] + '...', 'dim'); },
  games: () => print(Object.keys(PCFS.FS.c.Games.c).map(k => k + '*').join('   ') + '\n(old games: cd "Scrapped Games")  Type: open gut  or  open tig'),
  calc: a => { const e = a.join(' ').replace(/\^/g, '**');
    if (!e || !/^[\d+\-*/().%\s]+$/.test(e)) return print('calc: numbers and + - * / ^ % ( ) only', 'err');
    try { print(String(Function('"use strict";return (' + e + ')')())); } catch (x) { print('calc: invalid expression', 'err'); } },
  echo: a => print(a.join(' ')),
  date: () => print(new Date().toString()),
  whoami: () => print('user'),
  history: () => hist.forEach((h, i) => print(`${i + 1}  ${h}`)),
  theme: a => { const m = { green: '#7CFC9A', amber: '#ffb000', cyan: '#4fe3ff', white: '#e8e8e8' };
    if (!m[a[0]]) return print('theme: green, amber, cyan or white', 'err'); document.documentElement.style.setProperty('--fg', m[a[0]]); },
  neofetch: () => print(`user@main-menu
-------
OS:       Main Menu
Shell:    Command_Execute
Screen:   ${screen.width}x${screen.height}
Language: ${navigator.language}
Apps:     ${Object.keys(PCFS.FS.c.Apps.c).length}    Games: ${Object.keys(PCFS.FS.c.Games.c).length}`),
  clear: () => { out.innerHTML = ''; },
};
C.run = C.start = C.open; C.dir = C.ls; C.cls = C.clear;

function run(line) {
  print(`${$('pr').textContent} ${line}`, 'dim');
  const [cmd, ...a0] = line.trim().split(/\s+/);
  const a = ['cd', 'ls', 'dir', 'cat'].includes((cmd || '').toLowerCase()) && a0.length ? [a0.join(' ')] : a0;   // folder names can contain spaces
  if (!cmd) return;
  hist.push(line); hi = hist.length;
  const f = C[cmd.toLowerCase()];
  f ? f(a) : print(`${cmd}: command not found. Type help.`, 'err');
}
inp.addEventListener('keydown', e => {
  if (e.key === 'Enter') { run(inp.value); inp.value = ''; }
  else if (e.key === 'ArrowUp') { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { inp.value = hi < hist.length - 1 ? hist[++hi] : (hi = hist.length, ''); e.preventDefault(); }
  else if (e.key === 'Tab') { e.preventDefault(); const w = inp.value.split(/\s+/).pop().toLowerCase();
    if (w) { const r = PCFS.resolve(cwd, '.'); const k = Object.keys(r.node.c).find(x => x.toLowerCase().startsWith(w)); if (k) inp.value = inp.value.slice(0, inp.value.length - w.length) + k; } }
});
$('term').addEventListener('click', () => { if (!getSelection().toString()) inp.focus(); });
print('Command_Execute v1.0. Type help to see what you can do.');
setPrompt(); inp.focus();
})();
