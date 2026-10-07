/* Virtual file system shared by the Main Menu and the Command_Execute terminal.
   To add a game: put its folder in /games and add one line under Games below. */
(function (g) {
  const app = (title, icon, url, w, h, extra) => Object.assign({ t: 'app', title, icon, url, w, h }, extra);
  const FS = { t: 'dir', c: {
    Games: { t: 'dir', icon: '🎮', c: {
      'Galactic Upg Tree : Remade': app('Galactic Upg Tree : Remade', '🌌', 'games/galactic-upg-tree-remade/index.html', 980, 700, { max: true, alias: ['gut', 'remade', 'galactic', 'gt'] }),
    } },
    'Scrapped Games': { t: 'dir', icon: '🗑️', c: {
      'Typical Incremental Game': app('Typical Incremental Game', '♾️', 'games/scrapped/typical-incremental-game/index.html', 900, 680, { max: true, alias: ['tig', 'points'] }),
    } },
    Apps: { t: 'dir', icon: '🧩', c: {
      Command_Execute: app('Command_Execute', '⌨️', 'apps/command_execute/index.html', 680, 440),
    } },
    Documents: { t: 'dir', icon: '📄', c: {
      'README.txt': { t: 'txt', icon: '📝', text: 'Welcome to the Main Menu.\n\nGames holds the games that are still being updated.\nScrapped Games holds games that are finished and no longer updated.\nApps > Command_Execute is the terminal.\nClick an icon once to open it.' },
    } },
  } };
  /* Resolve a path relative to cwd (array of names). Returns {node, path} or null. */
  function resolve(cwd, p) {
    const parts = p.startsWith('/') ? [] : cwd.slice(), names = [];
    for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') { parts.pop(); continue; } parts.push(s); }
    let n = FS;
    for (const s of parts) {
      if (n.t !== 'dir') return null;
      const k = Object.keys(n.c).find(x => x.toLowerCase() === s.toLowerCase());
      if (!k) return null;
      n = n.c[k]; names.push(k);
    }
    return { node: n, path: names };
  }
  g.PCFS = { FS, resolve };
})(window);
