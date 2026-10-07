# Main Menu

A desktop in the browser: icons, draggable windows, folders, a taskbar and the **Main Menu** button. No build step and no dependencies.

## Layout

```
index.html                              the Main Menu (desktop)
os/                                     desktop code (os.js, os.css) and the file system (fs.js)
apps/command_execute/                   Command_Execute, a terminal mini-app
games/typical-incremental-game/         Typical Incremental Game (TIG)
games/galactic-upg-tree-remade/         Galactic Upg Tree : Remade (3D)
```

- Click an icon or folder once to open it. **Games** is a folder window listing every game.
- **Apps -> Command_Execute** is a terminal: try `help`, `ls`, `cd Games`, `open tig`, `open gut`, `calc 2^10`, `theme amber`.

## Publish on GitHub Pages

1. Upload everything in this folder to a repository, keeping the folders (or upload `main-menu-site.zip` contents).
2. **Settings -> Pages -> Deploy from a branch -> main / (root)**.
3. Visit `https://<your-username>.github.io/<repo-name>/`. Name the repo `<your-username>.github.io` for a shorter link.

## Add a game or app

1. Put its files in `games/<name>/` with an `index.html`.
2. Add one line in `os/fs.js` under `Games` (or `Apps`):
   `'My Game': app('My Game', '🎲', 'games/my-game/index.html', 800, 600),`

## Galactic Upg Tree : Remade

3D upgrade-tree incremental on a plain canvas (no libraries). Buy nodes with Cosmic Dust, then reset into Stars, Nebulae, Pulsars, Black Holes, Quasars and Galaxies. Menu has Eco mode (30 fps, no twinkle) for slow devices; quality also adapts automatically.
