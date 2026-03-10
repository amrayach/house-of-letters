# DeepWiki Architecture Summary

This is the code-checked short version of what DeepWiki currently gets right about the repo.

## Reliable orientation value

- The repo is a client-side `Vite + Three.js + Howler + Cloudflare Pages` app.
- `index.html` boots `src/main.js`, and `src/main.js` remains the runtime orchestrator.
- Rendering, audio, interaction, config, and content are split across the same major folders DeepWiki identified:
  - `src/renderer`
  - `src/audio`
  - `src/interaction`
  - `src/config`
  - `src/data`
  - `public`
- `src/data/letters.json` is the live content/data contract for the archive.
- Cloudflare Pages deployment still depends on `vite.config.js`, `public/_headers`, and `public/_redirects`.

## Corrections the code requires

- `src/audio/themeMixer.js` is still a placeholder logger/state holder. It does not crossfade or switch audible themes.
- `src/renderer/loadingScene.js` does use `/3d_sednaya/*` assets directly, so intro assets are a real runtime dependency.
- `src/renderer/lighting.js` uses ambient plus directional lights, not point lights.
- `scripts/compress-glb.js` is real, but its current source path is `public/assets/textures`, not the active runtime model directory. Treat it as workflow-sensitive.

## How to use this layer

- Use DeepWiki for subsystem orientation and likely hot spots.
- Use `docs/agents/shared/*.md` plus the owning source files for anything behavioral, line-level, or current-state sensitive.
