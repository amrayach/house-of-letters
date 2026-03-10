# DeepWiki Architecture Q&A

- Repository: `amrayach/house-of-letters`
- Extracted: `2026-03-09`
- Tool: `deepwiki.ask_question`

## Prompt

```text
Repository architecture extraction for documentation cross-check. Answer in markdown with short sections for: 1) top-level architecture and major subsystems, 2) file and folder responsibilities across src/main.js, src/renderer, src/audio, src/interaction, src/utils, public, scripts, and docs, 3) incomplete or placeholder areas, 4) performance-sensitive areas, 5) risky refactor zones and why they are risky. Keep claims specific to this repository.
```

## DeepWiki answer

### 1. Top-level architecture and major subsystems

DeepWiki describes the app as a client-side SPA built with Three.js and Howler.js, with an entry layer, orchestration layer, system layer, and data layer. It identifies these major subsystems:

- application orchestration in `src/main.js`
- 3D rendering in `src/renderer/sceneSetup.js`, `src/renderer/lighting.js`, `src/renderer/letters.js`, and `src/renderer/loadingScene.js`
- audio management in `src/audio/audioEngine.js` and `src/audio/themeMixer.js`
- input controls in `src/renderer/controls.js`
- interaction detection in `src/interaction/proximityManager.js`
- UI in `index.html` and `main.css`
- content data in `src/data/letters.json`
- configuration in `src/config/constants.js`

### 2. File and folder responsibilities

DeepWiki assigns these responsibilities:

- `src/main.js`
  - initializes scene, lighting, controls, loading scene, screen transitions, proximity detection, audio updates, and the main animation loop
- `src/renderer`
  - `sceneSetup.js`: scene, camera, renderer, fog
  - `lighting.js`: ambient, directional, and point lights
  - `letters.js`: loading of 46 GLB models with retry logic and material processing
  - `loadingScene.js`: cinematic intro and camera flight
  - `controls.js`: desktop pointer lock and mobile touch controls
- `src/audio`
  - `audioEngine.js`: singleton around Howler for themes, narration, ducking, and lazy loading
  - `themeMixer.js`: singleton responsible for crossfading background themes based on the active letter zone
- `src/interaction`
  - `proximityManager.js`: distance-based narration and visual triggers
- `src/utils`
  - `loaders.js`: singleton GLTF, texture, and audio loaders, plus `preloadAssets`
- `public`
  - `assets/models`, `assets/audio`, `assets/letters`, `_redirects`, `_headers`
- `scripts`
  - `compress-glb.js`: GLB compression and optimization script
- `docs`
  - not detailed beyond being a documentation folder

### 3. Incomplete or placeholder areas

DeepWiki explicitly called out subtitle text as incomplete. It noted that `src/main.js` contains a comment that subtitle text is currently mocked and would ideally come from `letterData.text` or `letterData.subtitle`.

### 4. Performance-sensitive areas

DeepWiki highlighted:

- loading 46 GLB models, with retry logic and a 10-minute timeout
- the `animate()` function as the main hot path
- spatial optimization for letter animation via `ANIMATION.LETTER_ANIMATION_RADIUS`
- proximity optimization via `INTERACTION.CHECK_RADIUS`
- GLB compression through `scripts/compress-glb.js`
- explicit resource cleanup on page unload

### 5. Risky refactor zones

DeepWiki marked these areas as risky:

- `src/main.js`
  - centralized orchestration, critical flags, and `transitionToGame()`
- `src/config/constants.js`
  - central tuning knobs with cross-module impact
- `src/renderer/letters.js`
  - async loading, retry handling, material replacement, and render-order logic
- `src/interaction/proximityManager.js`
  - trigger thresholds and active-letter state transitions
- `src/renderer/controls.js`
  - device-specific control selection, activation flow, and bird's-eye state

## Capture note

This raw answer is intentionally not corrected. See `../distilled/mismatches-vs-code.md` for code-checked differences.
