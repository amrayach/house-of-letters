# 02. Runtime Flow

## High-level sequence

1. `index.html` loads the overlay DOM, links `/src/styles/main.css`, and boots `/src/main.js`.
2. `src/main.js` immediately creates:
   - the cinematic `LoadingScene`
   - the archive `scene`, `camera`, and `renderer`
   - lighting and controls
3. Two async tracks then run in parallel:
   - intro camera sequence in `LoadingScene.start(...)`
   - archive letter/model loading via `loadLetters(...)`
4. Only when both tracks complete does `transitionToGame()` hide the loading screen and move the overlay shell into `start`.
5. The user clicks `Enter Archive`, which bootstraps audio and then:
   - on desktop, waits for pointer lock before moving into `active`
   - on mobile, activates touch controls immediately and moves into `active`
6. The archive render loop keeps running until page unload, but shell overlays are now explicitly state-gated.

## Detailed flow

### 1. Initial HTML load

- `index.html` defines:
  - `#loading-screen` and `#loading-scene-container`
  - `#start-screen` and `#pause-screen`
  - HUD/debug/subtitle/preview DOM
- Most overlay elements now start `hidden` and are revealed by `main.js` state sync rather than ad hoc inline `display` toggles.
- `main.js` resolves those DOM nodes up front.
- Important: the archive renderer is appended to `document.body` immediately, not after the intro.

### 2. Loading scene boot

- `new LoadingScene(loadingSceneContainer)` creates a separate Three.js scene/camera/renderer/composer.
- `loadingScene.start(onComplete)` starts a dedicated `requestAnimationFrame` loop for the intro.
- The intro loads 6 legacy JSON assets under `/3d_sednaya/` and starts the camera transition once those callbacks complete, even if some assets degraded or failed.
- `skip-intro-btn` calls `loadingScene.skipTransition()`, which completes the intro gate early but does not bypass archive asset loading.

### 3. Archive scene boot

- `initScene()` creates the gameplay `scene`, `camera`, and `renderer`, plus a large ground plane and grid.
- `initLighting(scene)` adds ambient + directional lights.
- `initControls(camera, renderer.domElement)` prepares:
  - desktop pointer-lock controls
  - mobile touch controls if touch capability is detected
- desktop pointer-lock requests now target the renderer canvas while start/pause buttons remain shell-owned DOM controls
- `animate()` is started immediately, before the start screen is shown.

### 4. Asset loading

- `loadLetters(scene, lettersData, renderer, updateProgress)` starts one GLB load per record in `letters.json`.
- `loadModelWithRetry(...)` retries each failed model up to 3 times with a 2-second delay.
- `Promise.race([... , loadingTimeout])` caps the total wait at `LOADING_TIMEOUT_MS` (10 minutes).
- `loadLetters(...)` is partial-success tolerant:
  - individual model failures are collected with `Promise.allSettled`
  - successfully loaded models still enter the scene
  - `assetsLoaded` becomes `true` even if some models failed
- Each loaded model gets:
  - scaled and positioned from `letters.json`
  - material replacement and texture color-space fixes
  - bounded texture anisotropy from the live renderer capabilities
  - a line geometry "string"
  - copied metadata in `model.userData`
  - derived interaction metadata in `model.userData.interaction`
- After letter loading succeeds, `main.js` creates `ProximityManager`.
- In the same post-load step, `main.js` creates `groundTimeline` only if `src/data/provisionalChronology.js` validates successfully and every chronology-covered letter model is present in the loaded runtime set.

### 5. Start screen gate

- `transitionToGame()` is called from two places:
  - after `loadingSceneComplete = true`
  - after `assetsLoaded = true`
- It only proceeds when both flags are true.
- When it proceeds:
  - the loading screen fades out
  - `loadingScene.dispose()` tears down the intro renderer/composer
  - `uiState` moves to `start`, which reveals only the start shell

### 6. Control activation

- `startBtn` click is the real runtime handoff:
  - `bootstrapExperience()` initializes audio once, starts the background theme, and registers narrations
  - on touch devices:
    - `activateControls()`
    - `uiState` moves to `active`
    - mobile pause/touch HUD become visible through `syncUiChrome()`
  - on desktop:
    - audio is paused until pointer lock succeeds
    - the start shell stays visible while pointer lock is requested
    - `pointerlockerror` or timeout keeps the user in a recoverable shell
- Desktop:
  - `controls.lock` moves the shell to `active` and resumes audio
  - `controls.unlock` forces bird's-eye off, moves the shell to `paused`, and pauses audio
- Mobile:
  - touch controls are enabled/disabled directly
  - `TouchControls` owns touch input state only
  - `main.js` remains the only owner of joystick/look HUD visibility
  - `#mobile-pause-btn` and `#resume-btn` own pause/resume
  - touch HUD stays hidden until `uiState === active`

### 7. Proximity detection

- Only while `uiState === active`, `proximityManager.update()`:
  - prefilters letters within `CHECK_RADIUS`
  - scores them from expanded trigger-volume distance, readable-side view alignment, readable-side facing, and a center-view focus bonus
  - keeps a minimal targeting snapshot with `candidateId/candidateSide/candidateScore` plus `activeId/activeSide/activeScore`
  - uses sticky bias and switch margin so active selection does not flap between nearby letters
- `src/renderer/letters.js` now provides local-space interaction metadata per letter:
  - root bounds center and size
  - expanded trigger box
  - front/back readable-side normals and centers
    - readable-side direction comes from the `Front` and `Back` node transforms first
    - current archive assets encode readable face direction in the side-node orientation, not in averaged display-mesh normals
    - mesh-normal synthesis remains fallback-only for malformed or missing side nodes
  - collider-based focus targets used for scoring
  - inspect anchors consumed by the dedicated inspect-mode camera framing
- Outside active runtime states, `main.js` calls `clearTargeting()` so highlight, narration, and active-letter UI do not leak behind loading, start, or pause shells.
- Activation side effects:
  - `audioEngine.playNarration(letterId)`
  - a material-agnostic outline cue on non-glass letter meshes
  - best-effort emissive tint on materials that support emissive
- `main.js` uses the returned `targetState.activeId` to:
  - keep a shell-facing `displayedActiveLetterId`
  - update `themeMixer` when the active ID changes
  - populate preview images
  - populate subtitle text
  - let `syncUiChrome()` reveal the preview/subtitle layer only when the runtime is in active immersive mode
- `main.js` also passes the minimal targeting snapshot plus movement speed and inspect/view state into `groundTimeline.update(...)`; chronology visibility and emphasis stay scene-native and do not widen `proximityManager`'s public contract.

### 8. Inspect mode

- Inspect is entered only from `uiState === active`, `viewMode === immersive`, and a valid proximity candidate.
- `main.js` snapshots a single `letterId` plus `side` for the inspect session and defaults the side to `front` if candidate-side data is missing or ambiguous.
- Once inspect begins, live targeting is cleared and proximity retargeting is suspended until inspect exits.
- `src/renderer/controls.js` exposes one explicit suppression seam so movement and look input stop mutating the camera during inspect.
- Desktop inspect intentionally releases pointer lock so the overlay can scroll and accept cursor input, then requests pointer lock again on inspect exit; touch inspect continues to use shell-owned overlay buttons.
- Inspect camera placement is computed from per-side metadata, inspect anchors, current aspect ratio, bounded distance clamps, and a narrower inspect FOV.
- Any inspect FOV change is followed immediately by `camera.updateProjectionMatrix()`.
- `main.js` interpolates into and out of inspect, and restores the saved free-walk camera pose and FOV on exit.
- Pause, pointer-lock unlock, and bird's-eye-invalid transitions force inspect to exit cleanly before the shell changes state.

### 9. Narration and theme behavior

- Background theme:
  - one theme starts on `startBtn` click
  - it uses `Howl({ html5: true, loop: true })`
  - it ducks while narration plays
  - document visibility always pauses it when the tab is hidden
  - document visibility only resumes it automatically when `main.js` still reports `uiState === active`
- Narration:
  - URLs are registered at start
  - actual `Howl` objects are created lazily on first proximity trigger
  - narration stop or `onend` restores theme volume
- Theme mixing:
  - `letter.theme` exists in data
  - `themeMixer.update(...)` only logs/state-tracks
  - no current code swaps or crossfades background themes per letter/zone

### 10. Archive render loop

- `animate()` does all per-frame runtime work:
  - state-aware `updateControls(delta)` while `uiState === active`
  - bird's-eye view-mode sync from `controls.js` into shell-facing `viewMode`
  - inspect transition updates, inspect UI sync, and inspect-specific letter-freeze behavior while inspect is active
  - debug HUD update
  - active-gated proximity update, suspended while inspect is active
  - preview/subtitle/theme updates when the active letter changes
  - grouped chronology thread update from `uiState`, `viewMode`, `inspectState.phase`, `candidateId`, `activeId`, and current movement speed
  - near-letter sway/bob/rotation animation around stored base transforms
  - `renderer.render(scene, camera)`

## Ownership summary

- Shell/UI ownership: `src/main.js`
  - `uiState`
  - shell visibility for loading/start/pause
  - HUD, bird's-eye indicator, touch HUD, debug panel, and active-letter overlay visibility
  - active-letter preview/subtitle content population
- Runtime/game-loop ownership: `src/main.js`
  - loading/start handoff
  - per-frame orchestration
  - derived shell-facing `viewMode`
- Ground chronology ownership: `src/renderer/groundTimeline.js`
  - grouped floor spine, per-letter anchors, per-letter connectors, and cached ground labels
  - hidden outside active play and in bird's-eye
  - ambient vs focused emphasis based only on frame state passed from `main.js`
- Controls/input ownership: `src/renderer/controls.js` and `src/interaction/touchControls.js`
  - pointer lock
  - keyboard/touch movement state
  - bird's-eye camera mutation and saved camera state
  - touch gesture tracking and reset
  - `main.js` may force bird's-eye exit when shell state changes make that mode invalid
- Active-letter ownership: `src/interaction/proximityManager.js`
  - readable-side candidate/active scoring
  - active highlight cue
  - narration trigger/stop handoff into audio
- Audio ownership: `src/audio/audioEngine.js`
  - Howler setup, background theme, narration caching/loading, ducking, pause/resume, and visibility listener backend
  - no authority over shell state; resume remains gated by runtime state supplied from `main.js`

### 11. Cleanup and disposal

- On `beforeunload`, `main.js`:
  - removes its DOM/control event listeners
  - `controls.dispose()`
  - `groundTimeline.dispose()`
  - `audioEngine.dispose()`
  - disposes letter geometries/materials/maps
  - disposes the loading scene if it is still alive
  - `renderer.dispose()`
- `LoadingScene.dispose()` removes its own renderer/composer and scene resources when the intro ends.
- Remaining partial cleanup:
  - scene-level resize cleanup still lives outside `main.js`
  - intro texture disposal is not explicit

## Fragile sequencing and state coupling

| Coupling | Why it is fragile | What to check after edits |
| --- | --- | --- |
| Intro gate = `assetsLoaded && loadingSceneComplete` | any missed callback leaves the user stuck on loading/start flow | skip intro, slow network, partial model failure, timeout path |
| Two render loops during loading | intro and archive both render before the start screen; performance changes hit load time too | FPS and CPU/GPU load during initial boot |
| Audio starts only on `startBtn` click | browser autoplay rules require user interaction; moving this earlier will break playback | desktop click path, mobile first tap, resume after tab hide |
| `themeMixer` vs `letter.theme` | metadata suggests per-letter themes, runtime does not implement them | do not assume JSON theme edits change audible behavior |
| Highlight logic vs material replacement | the active-state cue now depends on lazily added outline geometry plus optional emissive tint | active-letter visual feedback after material or non-glass detection edits |
| Letter animation vs loader orientation | loader stores the base facing angle and height, and `animate()` sways around those stored values | letter facing/orientation after motion changes |
| Desktop vs mobile pause/control branches | pointer-lock and touch controls use different activation paths, but the overlay shell is now the coordinating state machine | start, pointer-lock failure, pause, resume, and unlock behavior on both input modes |
| Touch HUD ownership | touch input and touch HUD are related but no longer share the same owner | mobile pause/resume, refresh, and resize without joystick/look leakage |
| Visibility-driven audio resume | the audio backend listens to `visibilitychange`, but runtime state decides whether resume is allowed | tab hide/show while active, paused, or waiting at start |
| Shell gating vs always-running render loop | overlays are now state-gated, but the scene and animation loop still continue behind them | shell exclusivity during loading, start, pause, and bird's-eye |
| Provisional chronology vs partial model loading | grouped chronology is validated against `letters.json`, but the scene-native thread also depends on every covered model loading successfully | partial asset-failure path, safe disable behavior, and no broken half-network on the floor |
| Cleanup coverage | unload paths are still split across `main.js` and `loadingScene.js`, even though control/audio listener cleanup is now explicit | memory leaks, duplicate listeners, repeated start/pause handling |
