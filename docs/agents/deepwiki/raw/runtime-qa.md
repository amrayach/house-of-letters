# DeepWiki Runtime Q&A

- Repository: `amrayach/house-of-letters`
- Extracted: `2026-03-09`
- Tool: `deepwiki.ask_question`

## Prompt

```text
Runtime lifecycle extraction for documentation cross-check. Describe the runtime sequence from index.html boot through main.js initialization, loading scene behavior, asset loading, start/pause handoff, control activation, animation loop, proximity/audio behavior, and cleanup. Call out sequencing gates and state coupling.
```

## DeepWiki answer

### 1. Boot and initialization

DeepWiki says `index.html` loads `src/main.js`, which immediately initializes the scene, camera, renderer, lighting, and controls. The main 3D scene is prepared before the experience becomes interactive.

### 2. Loading scene behavior

It describes `LoadingScene` as a parallel cinematic intro with a skip button. Completing or skipping the intro flips `loadingSceneComplete`.

### 3. Asset loading

DeepWiki says an async IIFE in `main.js` loads 46 GLB models through `loadLetters()`, tracks progress, shows a slow-connection warning, applies retry logic, and caps total wait time with `LOADING_TIMEOUT_MS`. After loading, `assetsLoaded` becomes `true` and `ProximityManager` is instantiated.

### 4. Sequencing gates and state coupling

DeepWiki correctly identified a dual gate in `transitionToGame()`: both `assetsLoaded` and `loadingSceneComplete` must be `true` before the loading screen fades out, the loading scene is disposed, and the start screen becomes visible.

### 5. Start/pause handoff and control activation

DeepWiki says the start screen is a user-gesture gate for audio. On `Enter Archive`, `audioEngine.init()` runs, background themes start, narrations are registered, and controls are activated. It also distinguishes:

- desktop pause/resume through pointer-lock `lock` and `unlock`
- mobile pause/resume through `mobile-pause-btn`, `deactivateControls()`, and `resumeBtn`

### 6. Animation loop

DeepWiki says `animate()` runs with `requestAnimationFrame`, updates controls, animates letters near the camera, and renders the scene.

### 7. Proximity and audio behavior

DeepWiki says `proximityManager.update()` checks for nearby letters, triggers `audioEngine.playNarration()`, applies a glow effect, and updates letter preview/subtitle UI. It also says `themeMixer.update()` adjusts background audio volume through ducking.

### 8. Cleanup

DeepWiki says `beforeunload` disposes audio, letter geometries/materials/textures, and the renderer.

## Capture note

This raw answer is intentionally not corrected. See `../distilled/confirmed-vs-unconfirmed.md` and `../distilled/mismatches-vs-code.md` for code-checked status.
