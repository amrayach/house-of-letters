# 02. Runtime Flow

## High-level sequence

1. `index.html` loads the overlay DOM, links `/src/styles/main.css`, and boots `/src/main.js`.
2. `src/main.js` immediately creates:
   - the archive `scene`, `camera`, and `renderer`
   - lighting and controls
   - the archive render loop starts immediately (behind the landing page)
3. The user sees the landing screen with four text panels and "Enter the Archive" CTA. No heavy loading happens yet.
4. The user clicks "Enter the Archive":
   - the loading screen is unhidden (was hidden on boot)
   - `LoadingScene` is created and started
   - core archive letter/model loading begins for zones 1 and 2
   - the landing screen fades out, revealing the loading screen
   - `uiState` moves from `landing` to `loading`
5. Two async tracks then run in parallel:
   - intro camera sequence in `LoadingScene.start(...)`
   - core archive letter/model loading for zones 1 and 2 via `loadLetters(...)`
6. Only when both tracks complete does `transitionToGame()` hide the loading screen and move the overlay shell into `start`.
7. The user clicks `Enter Archive`, which bootstraps audio and then:
   - on desktop, waits for pointer lock before moving into `active`
   - on mobile, activates touch controls immediately and moves into `active`
8. The first successful move into `active` also triggers one deferred background load for zones 3 and 4.
9. Successful deferred loads integrate directly into the live runtime, and `groundTimeline` initializes only if chronology-required coverage becomes complete.
10. The archive render loop keeps running until page unload, but shell overlays are now explicitly state-gated.

## Detailed flow

### 1. Initial HTML load

- `index.html` defines:
  - `#landing-screen` (visible by default, z-index 3000)
  - `#webgl-fallback` (hidden on boot, shown only when WebGL is unavailable)
  - `#loading-screen` and `#loading-scene-container` (hidden on boot)
  - `#start-screen` and `#pause-screen`
  - `#deferred-load-notice` (hidden on boot, shown when deferred loading degrades or fails)
  - HUD/debug/subtitle/preview DOM
- Most overlay elements now start `hidden` and are revealed by `main.js` state sync rather than ad hoc inline `display` toggles.
- `main.js` resolves those DOM nodes up front.
- Important: the archive renderer is appended to `document.body` immediately, not after the intro.

### 1b. Landing screen

- The landing screen is the first thing the user sees: four text panels in corners (desktop) or stacked vertically (mobile), with a centered "Enter the Archive" CTA.
- `uiState` starts as `LANDING`; no loading scene or asset loading happens yet.
- `syncLandingContent()` populates panel text from `src/config/landingContent.js`.
- Panels have a collapsed max-height (~3 lines). A "Read more" button appears only when text overflows.
- The landing screen has a staggered entrance animation (`landing-revealed` class triggers CSS keyframes).
- Clicking the CTA calls `handleEnterFromLanding()`:
  - Unhides `#loading-screen` (so the LoadingScene container has correct dimensions)
  - Creates the `LoadingScene` and starts it
  - Starts the async asset loading
  - Fades out the landing screen (opacity → 0 → hidden)
  - After fade: sets `uiState` to `LOADING`
- `handleEnterFromLanding()` is guarded by `hasLeftLanding` to prevent double-click issues.
- The landing screen is NOT managed by `syncUiChrome()` — its visibility uses manual opacity transition + hidden, same pattern as the loading screen in `transitionToGame()`.

### 2. Loading scene boot

- `new LoadingScene(loadingSceneContainer)` creates a separate Three.js scene/camera/renderer/composer. This is now deferred until the landing CTA is clicked, not created at module load.
- `loadingScene.start(onComplete)` starts a dedicated `requestAnimationFrame` loop for the intro.
- The intro loads 6 legacy JSON assets under `/3d_sednaya/` and starts the camera transition once those callbacks complete, even if some assets degraded or failed.
- `skip-intro-btn` calls `loadingScene.skipTransition()`, which completes the intro gate early but does not bypass archive asset loading.

### 3. Archive scene boot

- Before `initScene()`, a proactive WebGL check validates that the browser can create a WebGL context. If not, `#landing-screen` is hidden, `#webgl-fallback` is shown, and module execution halts via throw.
- `initScene()` is additionally wrapped in try-catch so GPU driver failures or context limit errors also show the fallback and halt execution.
- `initScene()` creates the gameplay `scene`, `camera`, and `renderer`, plus a large ground plane and grid.
- `initLighting(scene)` adds ambient + directional lights.
- `initControls(camera, renderer.domElement)` prepares:
  - desktop pointer-lock controls
  - mobile touch controls if touch capability is detected
- desktop pointer-lock requests now target the renderer canvas while start/pause buttons remain shell-owned DOM controls
- `animate()` is started immediately, before the start screen is shown.

### 4. Asset loading

- `main.js` partitions `letters.json` into staged groups with `resolveLetterLoadStage(letter)`:
  - core startup letters are zones 1 and 2
  - deferred letters are zones 3 and 4
- Startup loading uses `loadLetters(scene, startupLetters, renderer, updateProgress)` where `startupLetters` is only the core subset.
- The loading shell progress text and counts reflect only that startup subset.
- `loadModelWithRetry(...)` retries each failed model up to 3 times with a 2-second delay.
- `Promise.race([... , loadingTimeout])` caps the total wait at `LOADING_TIMEOUT_MS` (10 minutes).
- `loadLetters(...)` is partial-success tolerant:
  - individual model failures are collected with `Promise.allSettled`
  - successfully loaded models still enter the scene
  - the core stage can still mark `assetsLoaded = true` if some startup letters failed but enough loaded for the promise to resolve
- Each loaded model gets:
  - scaled and positioned from `letters.json`
  - material replacement and texture color-space fixes
  - bounded texture anisotropy from the live renderer capabilities
  - a line geometry "string"
  - copied metadata in `model.userData`
  - derived interaction metadata in `model.userData.interaction`
- After the core startup load succeeds, `main.js`:
  - populates `letterObjectById`
  - creates `ProximityManager`
  - attempts `tryInitializeGroundTimeline()`
- `groundTimeline` is not guaranteed at startup:
  - it initializes only if `src/data/provisionalChronology.js` validates successfully and every chronology-covered letter model is already present
  - if required chronology letters live in deferred zones, initialization is delayed until later integration or remains disabled

### 5. Deferred post-entry loading

- `startDeferredLetterLoad()` is owned by `main.js` and guarded by `hasTriggeredDeferredLetterLoad`, so it runs at most once per session.
- Deferred loading starts only after successful archive entry:
  - desktop triggers it from `handleDesktopLock()` after pointer lock has actually moved the shell into `active`
  - touch triggers it from `handleStartExperience()` after touch controls are active and the shell has moved into `active`
- Deferred loading reuses the existing `loadLetters(scene, deferredLetters, renderer)` contract with no new loader ownership and no second shell state.
- Deferred results are finalized in `finalizeDeferredLetterLoad(...)`:
  - `ready` when all requested late letters integrate
  - `degraded` when some late letters integrate and some remain missing
  - `failed` when none of the late letters integrate or the deferred load rejects outright
- `integrateLateLoadedLetters(...)` keeps late-letter ownership narrow:
  - it deduplicates against `letterObjectById`
  - it appends new letters through `proximityManager.addLetters(...)` when proximity already exists
  - it falls back to creating `ProximityManager` only if startup somehow reached this point without one
- After integration, `main.js` retries `tryInitializeGroundTimeline()` and leaves the thread disabled if required coverage is still incomplete.

### 6. Start screen gate

- `transitionToGame()` is called from two places:
  - after `loadingSceneComplete = true`
  - after `assetsLoaded = true` for the core startup subset
- It only proceeds when both flags are true.
- When it proceeds:
  - the loading screen fades out
  - `loadingScene.dispose()` tears down the intro renderer/composer
  - `uiState` moves to `start`, which reveals only the start shell

### 7. Control activation

- `startBtn` click is the real runtime handoff:
  - `bootstrapExperience()` initializes audio once, starts the background theme, and registers narrations
  - on touch devices:
    - `activateControls()`
    - `uiState` moves to `active`
    - deferred zone 3/4 loading starts immediately after that successful active transition
    - mobile pause/touch HUD become visible through `syncUiChrome()`
  - on desktop:
    - audio is paused until pointer lock succeeds
    - the start shell stays visible while pointer lock is requested
    - `pointerlockerror` or timeout keeps the user in a recoverable shell
- Desktop:
  - `controls.lock` moves the shell to `active`, resumes audio, and triggers deferred loading once
  - `controls.unlock` forces bird's-eye off, moves the shell to `paused`, and pauses audio
- Mobile:
  - touch controls are enabled/disabled directly
  - `TouchControls` owns touch input state only
  - `main.js` remains the only owner of joystick/look HUD visibility
  - `#mobile-pause-btn` and `#resume-btn` own pause/resume
  - touch HUD stays hidden until `uiState === active`

### 8. Proximity detection

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
  - populate subtitle text (with chronology date-range fallback from `provisionalChronology.js` when `letterData.text` is absent)
  - let `syncUiChrome()` reveal the preview/subtitle layer only when the runtime is in active immersive mode
- `main.js` also passes the minimal targeting snapshot plus movement speed and inspect/view state into `groundTimeline.update(...)`; chronology visibility and emphasis stay scene-native and do not widen `proximityManager`'s public contract.

### 9. Deferred degraded status surfaces

- Deferred background load state is stored in `letterLoadStageState[LETTER_LOAD_STAGE.DEFERRED]`.
- `getDeferredStageStatusText()` produces the user-facing degraded or failed copy:
  - degraded: some later letters are unavailable this session
  - failed: later letters could not be loaded, but the user can keep exploring the core archive
- `syncLetterLoadStageUi()` keeps both minimal status surfaces sourced from that same state:
  - desktop reuses `#controls-hint`
  - touch uses `#touch-deferred-status`
- The touch status pill remains intentionally narrow:
  - it is shell-owned in `main.js`
  - it is shown only for touch devices in `uiState === active` and `viewMode === immersive`
  - it hides during loading, start, pause, bird's-eye, and inspect
- A non-blocking notification bar (`#deferred-load-notice`) is shown at the top of the viewport when deferred loading settles as degraded or failed. It auto-dismisses after 8 seconds and has a manual close button. This supplements the existing minimal surfaces rather than replacing them.

### 10. Inspect mode

- Inspect is entered only from `uiState === active`, `viewMode === immersive`, and a valid proximity candidate.
- `main.js` snapshots a single `letterId` plus `side` for the inspect session and defaults the side to `front` if candidate-side data is missing or ambiguous.
- Once inspect begins, live targeting is cleared and proximity retargeting is suspended until inspect exits.
- `src/renderer/controls.js` exposes one explicit suppression seam so movement and look input stop mutating the camera during inspect.
- Desktop inspect intentionally releases pointer lock so the overlay can scroll and accept cursor input, then requests pointer lock again on inspect exit; touch inspect continues to use shell-owned overlay buttons.
- Inspect camera placement is computed from per-side metadata, inspect anchors, current aspect ratio, bounded distance clamps, and a narrower inspect FOV.
- Any inspect FOV change is followed immediately by `camera.updateProjectionMatrix()`.
- `main.js` interpolates into and out of inspect, and restores the saved free-walk camera pose and FOV on exit.
- Pause, pointer-lock unlock, and bird's-eye-invalid transitions force inspect to exit cleanly before the shell changes state.

### 11. Narration and theme behavior

- Background theme:
  - theme auto-plays once buffered after the landing CTA click (`prepareBackgroundTheme` `onload` callback); `playBackgroundTheme` on `startBtn` click is a no-op if already playing
  - it uses `Howl({ html5: true, loop: true })`
  - it ducks proportionally while narration plays — theme volume interpolates between `AUDIO.THEME_VOLUME` and `AUDIO.DUCKING_VOLUME` based on narration volume ratio
  - document visibility always pauses it when the tab is hidden
  - document visibility only resumes it automatically when `main.js` still reports `uiState === active`
- Narration:
  - URLs are registered at start
  - actual `Howl` objects are created lazily on first proximity trigger
  - pending narration requests are invalidated on focus loss or target switches, so late audio loads cannot start after the user has already left that letter
  - narration volume scales with distance from the active letter per frame (`AUDIO.NARRATION_FADE_NEAR` to `AUDIO.NARRATION_FADE_FAR` with configurable exponent)
  - `activateNarration(letterId)` resumes from the paused position for the same letter, or pauses the old narration and starts fresh for a different letter
  - `deactivateNarration()` pauses (not stops) the narration, preserving the playhead position for later resume
  - `restartNarration(letterId)` always seeks to the beginning and plays at full volume — used when entering inspect mode
  - `setNarrationVolume(volume)` is called per-frame from `main.js` using `currentTargetState.activeId` and auto-pauses when volume reaches 0, auto-resumes when volume rises above 0
  - per-frame volume updates are skipped during inspect mode (`inspectState.phase !== IDLE`) — `restartNarration` sets full volume directly
  - `isGloballyPaused` prevents per-frame volume updates from interfering with the global pause/visibility system
  - narration `onend` restores theme volume and clears current narration state
- Theme mixing:
  - `letter.theme` exists in data
  - `themeMixer.update(...)` only logs/state-tracks
  - no current code swaps or crossfades background themes per letter/zone

### 12. Archive render loop

- `animate()` does all per-frame runtime work:
  - state-aware `updateControls(delta)` while `uiState === active`
  - bird's-eye view-mode sync from `controls.js` into shell-facing `viewMode`
  - inspect transition updates, inspect UI sync, and inspect-specific letter-freeze behavior while inspect is active
  - debug HUD update
  - active-gated proximity update, suspended while inspect is active
  - preview/subtitle/theme updates when the active letter changes
  - sequential chronology spine update from `uiState`, `viewMode`, `inspectState.phase`, `candidateId`, `activeId`, and current movement speed
  - near-letter sway/bob/rotation animation around stored base transforms
  - `renderer.render(scene, camera)`

## Ownership summary

- Shell/UI ownership: `src/main.js`
  - `uiState`
  - shell visibility for loading/start/pause
  - HUD, bird's-eye indicator, touch HUD, debug panel, and active-letter overlay visibility
  - staged letter-load state and the minimal deferred degraded-status surfaces
  - active-letter preview/subtitle content population
- Runtime/game-loop ownership: `src/main.js`
  - loading/start handoff
  - startup core-vs-deferred sequencing
  - late-letter integration into the live runtime
  - per-frame orchestration
  - derived shell-facing `viewMode`
- Ground chronology ownership: `src/renderer/groundTimeline.js`
  - sequential floor spine through all letters in ID order, per-letter anchors, and cached ground labels
  - construction is delayed until `main.js` confirms full chronology coverage from the currently integrated letters
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
| Intro gate = `assetsLoaded && loadingSceneComplete` | `assetsLoaded` now means the core startup subset only, so older "all letters before entry" assumptions are wrong and any missed callback still leaves the user stuck on loading/start flow | skip intro, slow network, partial startup model failure, timeout path |
| Two render loops during loading | intro and archive both render before the start screen; performance changes hit load time too | FPS and CPU/GPU load during initial boot |
| Theme auto-plays on buffer ready after landing CTA | AudioContext is resumed on landing CTA user gesture; `onload` callback plays if not globally paused; `playBackgroundTheme` on `startBtn` click is a no-op if already playing | desktop click path, mobile first tap, tab hide during buffering, resume after tab hide |
| Deferred load is deferred to next macrotask | `startDeferredLetterLoad()` is wrapped in `setTimeout(0)` so the first active frame paints without the ~30ms cost of queuing 40 GLB fetches | deferred load still starts, late-letter integration still works, one-shot guard still prevents duplicates |
| `themeMixer` vs `letter.theme` | metadata suggests per-letter themes, runtime does not implement them | do not assume JSON theme edits change audible behavior |
| Highlight logic vs material replacement | the active-state cue now depends on lazily added outline geometry plus optional emissive tint | active-letter visual feedback after material or non-glass detection edits |
| Letter animation vs loader orientation | loader stores the base facing angle and height, and `animate()` sways around those stored values | letter facing/orientation after motion changes |
| Desktop vs mobile pause/control branches | pointer-lock and touch controls use different activation paths, but the overlay shell is now the coordinating state machine | start, pointer-lock failure, pause, resume, and unlock behavior on both input modes |
| Deferred load start timing | zones 3 and 4 now depend on the first successful active transition, not startup completion | desktop pointer-lock success, mobile start entry, and one-shot guarding against duplicate deferred loads |
| Late-letter integration | deferred letters join a live scene and active proximity set after the session has already started | active session continuity, no duplicate letters, and new late letters becoming targetable without a reload |
| Touch HUD ownership | touch input and touch HUD are related but no longer share the same owner | mobile pause/resume, refresh, and resize without joystick/look leakage |
| Visibility-driven audio resume | the audio backend listens to `visibilitychange`, but runtime state decides whether resume is allowed | tab hide/show while active, paused, or waiting at start |
| Shell gating vs always-running render loop | overlays are now state-gated, but the scene and animation loop still continue behind them | shell exclusivity during loading, start, pause, and bird's-eye |
| Provisional chronology vs partial model loading | grouped chronology is validated against `letters.json`, but the scene-native thread now depends on every covered model loading successfully across both startup and deferred stages | partial asset-failure path, safe disable behavior, and no broken half-network on the floor |
| Deferred degraded status surfaces | desktop and touch now expose the same degraded state through different minimal surfaces, both gated from `main.js` | controls-hint text on desktop, touch pill visibility, and no leakage into pause/start/inspect |
| Cleanup coverage | unload paths are still split across `main.js` and `loadingScene.js`, even though control/audio listener cleanup is now explicit | memory leaks, duplicate listeners, repeated start/pause handling |
