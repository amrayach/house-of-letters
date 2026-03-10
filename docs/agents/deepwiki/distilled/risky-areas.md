# Risky Areas

These are the highest-risk areas after comparing DeepWiki output with local code.

## `src/main.js`

- Owns the dual loading gate: `assetsLoaded && loadingSceneComplete`.
- Starts the archive render loop before the start screen handoff completes.
- Mixes per-frame control updates, DOM updates, proximity checks, theme-mixer calls, letter motion, and rendering.
- Any refactor here needs re-validation of intro skip, slow-load behavior, start/pause flow, and active-letter UI.

## `src/renderer/letters.js`

- Owns async GLB loading, retry behavior, material replacement, string attachment, metadata copying, and final scene insertion.
- It replaces many materials with `MeshBasicMaterial`, which affects highlight behavior and lighting assumptions elsewhere.
- `main.js` later overwrites `rotation.y`, so loader-time facing logic is not the final runtime orientation.

## `src/renderer/loadingScene.js`

- Runs a separate renderer/composer and its own animation loop during boot.
- Depends on `/3d_sednaya/*` legacy JSON assets and an image texture.
- Small changes here can break the intro gate, asset loading perception, or GPU cost during startup.

## `src/renderer/controls.js` and `src/interaction/touchControls.js`

- Desktop pointer lock and mobile touch controls follow different activation and pause/resume branches.
- Bird's-eye mode mutates the active camera and restores saved camera state later.
- Regressions here often show up only on one input mode.

## `src/audio/audioEngine.js` and `src/audio/themeMixer.js`

- Audible behavior is split awkwardly between a real backend (`audioEngine.js`) and a placeholder policy layer (`themeMixer.js`).
- `letters.json.theme` looks richer than the current runtime behavior.
- Refactors here need explicit decisions about whether theme selection is global, per zone, or per letter.

## `src/data/letters.json` plus `public/assets/**`

- The repo relies on root-absolute asset paths and stable naming.
- `letters.json`, `public/_headers`, `public/_redirects`, and intro asset paths all assume the same deploy shape.
- Mass renames or numbering changes are high-risk unless validated end to end.
