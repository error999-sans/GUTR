# Galactic Upg Tree : Remade

A 2D upgrade-tree incremental game. No build step and no dependencies: open `index.html`.

- **Cosmic Dust** buys nodes in a branching upgrade tree.
- **Six reset layers** unlock one at a time, each with its own tab: Stars, Nebulae, Pulsars, Black Holes, Quasars, Galaxies.
- Every layer adds a new currency (Starlight, Gas, Pulses, Matter, Plasma, Worlds) with three repeatable upgrades, plus its own upgrade tree.
- Each layer plays a unique animation the first time you reach it, and never again.
- Five generated music tracks (Drift, Pulse, Nebula, Event Horizon, Starlight), or Auto, which follows your progress.
- Layers take longer and longer; dust production is soft-capped so numbers stay readable.

## Publish on GitHub Pages

Upload these five files (`index.html`, `style.css`, `gate.js`, `core.js`, `app.js`) to the root of a repository, then **Settings -> Pages -> Deploy from a branch -> main / (root)**. Your game will be at `https://<your-username>.github.io/<repo-name>/`.

## Tuning

All balance numbers (layer requirements, tree costs, boosts) are at the top of `core.js`.

## Beta key

The game asks for a beta key before it loads. The check is client-side, so it keeps casual visitors out but is not real security. To change the key, replace the `OK` hash in `gate.js` (the hash function is in the same file).
