---
name: react-vite
description: >
  Project-specific skill for House of Letters 2 — a Three.js + Vite immersive 3D letter
  archive. Covers architecture, module conventions, asset pipeline, rendering, audio,
  interaction, and common modification patterns. Consult before modifying any module,
  adding features, debugging rendering/audio issues, or adjusting letter data.
---

# House of Letters 2 — Project Skill

Immersive 3D letter gallery built with **Three.js 0.181 + Vite 7 + Howler.js** (vanilla JS, no framework).
Users walk through a virtual archive of 47 suspended letters, each with narration, images, and theme music.

## Architecture Overview

```
src/
├── main.js                  # Bootstrap, game loop, state management
├── config/constants.js      # All tunable values (scene, camera, model, audio, interaction)
├── renderer/
│   ├── sceneSetup.js        # THREE.Scene, Camera, Renderer, Fog, ground plane
│   ├── controls.js          # PointerLock (desktop) + TouchControls (mobile), bird's eye
│   ├── letters.js           # GLB loading, material setup, string attachment
│   ├── lighting.js          # Ambient + 3 directional lights
│   ├── loadingScene.js      # Cinematic intro (separate scene, post-processing, drone camera)
│   └── particles.js         # Dust particle system (500 points)
├── audio/
│   ├── audioEngine.js       # Howler.js singleton — theme, narration, ducking
│   └── themeMixer.js        # Per-zone theme crossfading
├── interaction/
│   ├── proximityManager.js  # Camera-to-letter distance checks, activation/deactivation
│   └── touchControls.js     # Mobile joystick + drag-to-look
├── data/
│   └── letters.json         # 46 letter entries (position, zone, assets, text)
├── utils/loaders.js         # GLTF, Texture, Audio loader wrappers
└── styles/main.css          # All UI (loading, HUD, subtitles, debug, mobile)
```

## Key Conventions

### Module Pattern
- Each module exports a setup/init function or a singleton instance
- No classes except where Three.js requires them (e.g. controls)
- `main.js` orchestrates all modules — it's the only file that imports from multiple directories

### Constants-First Configuration
All tunable values live in `src/config/constants.js`:
- `MODEL.SCALE` (8), `MODEL.GRID_SCALE` (4.0), `MODEL.Y_POSITION` (1.6)
- `AUDIO.DUCKING_VOLUME` (0.3), `AUDIO.FADE_DURATION` (500)
- `INTERACTION.PROXIMITY_THRESHOLD` (3), `INTERACTION.CHECK_RADIUS` (15)
- `LOADING_TIMEOUT_MS` (600000), `LOADING_RETRY.MAX_RETRIES` (3)

**Never hardcode values in modules** — import from constants.

### Material Strategy
- **Letter meshes**: `MeshBasicMaterial` with SRGB texture map (unlit — avoids lighting artifacts on scanned documents), `FrontSide` only, texture U-flipped (`repeat.x=-1, offset.x=1`), inward-wound duplicate skin dropped from the index buffer at load — the source GLBs bake a mirrored duplicate skin into every paper sheet (verify with `dev/paper-orientation-check.html`)
- **Glass/plexi**: `MeshBasicMaterial`, transparent, opacity 0.15, double-sided
- **Strings**: `LineBasicMaterial`, white, opacity 0.15, frustum culling disabled

Materials are detected by mesh name in the GLB:
- Names containing `glass` or `plexi` → glass material
- Names containing `material_front` or `material_back` → letter texture material

### Path Aliases (vite.config.js)
```
@         → src/
@audio    → src/audio/
@renderer → src/renderer/
@data     → src/data/
@config   → src/config/
@utils    → src/utils/
@interaction → src/interaction/
```

## Asset Pipeline

### Models (47 GLB files)
- Path: `public/assets/models/{id}.glb` (1–47)
- Size: 250–560 KB each, textures embedded
- Compression: `pnpm compress` runs `scripts/compress-glb.js` (@gltf-transform)
- Loading: GLTFLoader with 3 retries, 2s delay, 10-minute total timeout

### Audio (17 MP3 files)
- Themes: `public/assets/audio/theme_1.mp3`, `theme_2.mp3`
- Narrations: `public/assets/audio/narration_1.mp3` through `narration_15.mp3`
- Zone 1–3 letters play `theme_1`, zone 4+ play `theme_2`
- Narrations cycle: 15 files shared across 46 letters

### Letter Images (92 JPGs)
- Front: `public/assets/letters/{id}.jpg`
- Back: `public/assets/letters/{id}-1.jpg`
- Displayed in `#letter-preview` when letter is activated

### Loading Scene (legacy)
- 3D building JSON models in `public/assets/3d_sednaya/` (LegacyJSONLoader)
- Separate Three.js scene with postprocessing (Bloom, Vignette, ChromaticAberration, Noise)
- Cinematic drone camera on 27-waypoint CatmullRomCurve3 spline (~22s flight)

## Rendering Details

### Main Scene
- WebGLRenderer: antialias, ACESFilmicToneMapping, exposure 1.0
- FogExp2 density 0.01
- No shadows (performance)
- No post-processing (only loading scene uses postprocessing)
- Ground plane at y=0 with GridHelper

### Letter Positioning
Letters are placed on a grid: `x * GRID_SCALE`, `y = 1.6`, `z * GRID_SCALE`.
Each model faces the origin: `rotation.y = atan2(position.x, position.z)`.
A vertical string (Line) extends from model top to y=50.

### Animation Loop (main.js)
1. Update controls (velocity + damping)
2. Check proximity to letters (ProximityManager)
3. Animate nearby letters (gentle rotation + bob within LETTER_ANIMATION_RADIUS)
4. Update theme mixer (zone-based crossfade)
5. Render scene

### Frustum Culling
- Letters have precomputed bounding boxes
- Strings have `frustumCulled = false` (must always render)

## Audio System

### AudioEngine (singleton)
- `init()` — resume AudioContext on first user interaction
- `playBackgroundTheme(url)` — loop theme, fade in
- `registerNarration(letterId, url)` — store URL for lazy loading
- `playNarration(letterId)` — lazy-load Howl, play, duck theme to 0.3
- `pause() / resume()` — global pause (tab visibility aware)
- `dispose()` — cleanup on unload

### Theme Ducking
When narration starts: theme fades to `DUCKING_VOLUME` (0.3) over `FADE_DURATION` (500ms).
When narration ends: theme fades back to full volume.

## Interaction System

### ProximityManager
- Polls every animation frame
- **Check radius** (15 units): Skip distance calc for far letters
- **Proximity threshold** (3 units): Activate letter
- On activate: Play narration, show images, add emissive glow to meshes
- On deactivate: Stop narration, hide images, restore original emissive

### Controls
- **Desktop**: PointerLockControls — click to lock, ESC to unlock, WASD/arrows to move
- **Mobile**: TouchControls — left joystick for movement, right-drag for look
- **Bird's Eye**: Press B — orthographic top-down view, WASD pans, Q/E zooms

## Data Format (letters.json)

```json
{
  "id": 1,
  "text": "Subtitle text shown during narration",
  "position": {"x": 0, "y": 1.6, "z": -37.5},
  "zone": 1,
  "narration": "/assets/audio/narration_1.mp3",
  "theme": "/assets/audio/theme_1.mp3",
  "frontImage": "/assets/letters/1.jpg",
  "backImage": "/assets/letters/1-1.jpg",
  "model": "/assets/models/1.glb"
}
```

**Zones** define spatial groupings and theme assignment:
- Zone 1: z ≈ -60 to -55
- Zone 2: z ≈ -35 to -20
- Zone 3: z ≈ 0 to 25
- Zone 4: z ≈ 45 to 90

## Common Modification Patterns

### Adding a New Letter
1. Add GLB to `public/assets/models/{id}.glb`
2. Add front/back JPGs to `public/assets/letters/`
3. Add entry to `src/data/letters.json` with position, zone, asset paths
4. No code changes needed — letters.js loads all entries dynamically

### Adjusting Letter Layout
- Edit `position` in `letters.json` (raw grid coords, scaled by `GRID_SCALE` at load time)
- Or change `MODEL.GRID_SCALE` in constants.js for global spacing

### Changing Lighting / Atmosphere
- Edit `src/renderer/lighting.js` for light types/intensity
- Edit `SCENE.FOG_DENSITY` in constants.js for fog
- Edit renderer tone mapping / exposure in `sceneSetup.js`

### Adding Post-Processing to Main Scene
The main scene has no post-processing. To add:
1. Import from `postprocessing` (already a dependency)
2. Create EffectComposer in `sceneSetup.js`
3. Replace `renderer.render()` call in main.js animation loop with `composer.render()`
4. Reference `loadingScene.js` for working postprocessing examples

### Modifying the Loading Sequence
`loadingScene.js` is self-contained (1200+ lines). Key entry points:
- `initLoadingScene()` — setup
- Camera spline waypoints array — edit for different drone path
- Post-processing effects — each has its own configuration object
- `skipIntroBtn` handler — jumps to completion

### Adding New Audio
- Place MP3 in `public/assets/audio/`
- Reference path in `letters.json` or call `audioEngine.playBackgroundTheme(url)` directly
- For narration: `audioEngine.registerNarration(id, url)` then `audioEngine.playNarration(id)`

### Mobile / Touch Adjustments
- Joystick sensitivity: `touchControls.js` constants (dead zone 0.15, look sensitivity 0.003)
- Touch area layout: CSS in `main.css` (`.touch-*` classes)
- Movement speed same as desktop (controlled via `constants.js`)

## Debugging

### Debug Panel
Press nothing — the debug panel is always visible (toggle via CSS `#debug-panel`):
- Speed slider: Adjusts walking speed in real time
- Position readout: Camera x/y/z
- Current speed: Actual velocity magnitude

### Bird's Eye View
Press **B** to toggle — shows all letters from above with zone color coding.
Useful for verifying letter positions after data changes.

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Model doesn't appear | Wrong ID in letters.json or missing GLB | Check `public/assets/models/` and data entry |
| Black/missing texture | Material name doesn't match glass/letter pattern | Check mesh names in GLB (Blender export) |
| Audio doesn't play | AudioContext suspended | Ensure `audioEngine.init()` called after user gesture |
| Letter not activating | Position too far from walkable path | Check z-position in letters.json, verify in bird's eye |
| Loading hangs | Large GLB or slow network | Check `LOADING_TIMEOUT_MS`, retry logic in letters.js |
| Mobile controls stuck | Touch event not ending | Check touchControls.js `handleTouchEnd` cleanup |

## Build & Deploy

```bash
pnpm dev          # Dev server with HMR (opens browser)
pnpm build        # Production build to dist/
pnpm preview      # Preview production build
pnpm compress     # Compress GLB models (gltf-transform)
```

Three.js is code-split into a separate chunk (`manualChunks` in vite.config.js).
