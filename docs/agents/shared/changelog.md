# Changelog

## Session 1 — Movement speed + loading text cleanup

**Date:** 2026-03-19
**Scope:** tiny fix — two independent changes

### Changes
1. Default walking speed lowered from 100 to 40 (`src/renderer/controls.js`). Debug slider default updated to match (`index.html`).
2. Removed "X/Y models" progress text from loading screen (`src/main.js` updateProgress callback). The `#loading-progress` DOM element is preserved but no longer populated during asset loading.

### Files changed
- `src/renderer/controls.js` — walkingSpeed default
- `index.html` — speed slider default value and display
- `src/main.js` — updateProgress callback

### Validated
- `npm run build` clean
- No regressions to loading screen, start screen, or debug panel

### Part of
Client request series: movement speed / timeline / audio / landing page (session 1 of 5)

## Session 2 — Audio rearchitecture: distance-based volume + pause/resume + inspect restart

**Date:** 2026-03-19
**Scope:** focused workstream — cross-subsystem audio behavior change

### Behavioral changes
1. Narration volume now scales with distance from the active letter (configurable fade from `NARRATION_FADE_NEAR` to `NARRATION_FADE_FAR` with exponent curve).
2. Leaving a letter's proximity pauses the narration instead of stopping it. Returning resumes from the paused position.
3. Approaching a different letter pauses the previous narration and plays/resumes the new one.
4. Entering inspect mode (E key / inspect button) restarts the narration from the beginning at full volume.
5. Background theme volume ducks proportionally to narration volume — swells back as user walks away from a letter.
6. Only one narration is ever unpaused at a time.

### API changes in audioEngine.js
- `playNarration(letterId)` → replaced by `activateNarration(letterId)` (resume-aware) and `restartNarration(letterId)` (seek to start)
- `stopNarration()` → replaced by `deactivateNarration()` (pause instead of stop)
- `stopAllNarrations()` → removed (no longer needed)
- New: `setNarrationVolume(volume)` — per-frame volume control with auto-pause/resume and proportional theme ducking
- New: `duckBackgroundTheme()` and `pauseCurrentNarration()` helpers
- New: `isGloballyPaused` state to prevent per-frame volume updates from interfering with pause screen/visibility handler

### New constants (constants.js)
- `AUDIO.NARRATION_FADE_NEAR` (2) — full volume distance
- `AUDIO.NARRATION_FADE_FAR` (10) — zero volume distance
- `AUDIO.NARRATION_FADE_EXPONENT` (1.5) — falloff curve shape
- Removed: `AUDIO.MAX_DISTANCE` (unused placeholder, replaced by above)

### Files changed
- `src/audio/audioEngine.js` — core rearchitecture
- `src/interaction/proximityManager.js` — activateLetter/deactivateLetter call sites
- `src/main.js` — per-frame volume update in animate loop + inspect restart + computeNarrationVolume helper
- `src/config/constants.js` — new fade distance constants, removed MAX_DISTANCE
- `docs/agents/shared/02-runtime-flow.md` — updated narration behavior documentation
- `.claude/rules/audio.md` — updated audio rules with new API surface

### Ownership preserved
- audioEngine owns all playback decisions
- proximityManager owns activation/deactivation triggers
- main.js orchestrates per-frame volume and inspect restart

### Validated
- `npm run build` clean
- No remaining references to old playNarration/stopNarration/stopAllNarrations API
- Global pause/resume and visibility handler preserved
- `isGloballyPaused` set/cleared correctly in all paths

### Part of
Client request series: movement speed / timeline / audio / landing page (session 2 of 5)

## Session 3 — Continuous sequential timeline

**Date:** 2026-03-19
**Scope:** focused workstream — timeline geometry rework

### Behavioral changes
1. The ground timeline is now a single continuous line threading through all 46 letters in ID order (1 → 2 → ... → 46).
2. Branch connectors from spine to letter anchors have been removed entirely.
3. The line is thinner and more subtle (core radius 0.04, was 0.12; halo radius 0.10, was 0.28).
4. Anchor points (circles) remain at each letter's ground position, directly on the spine.
5. Labels still show date ranges from provisionalChronology.js when focused.
6. Focus/ambient transitions preserved — nearby anchor glows brighter when a letter is active.
7. Head/tail padding extends along the first/last segment direction (not fixed ±Z) to avoid endpoint kinks.

### Architecture preserved
- `createGroundTimeline()` API contract unchanged
- `update(frameState)` interface unchanged
- Safe-disable pattern preserved
- main.js initialization and animate() loop untouched
- provisionalChronology.js data structure preserved (still used for labels and validation)

### Removed code
- All connector geometry (connectorCore, connectorHalo per anchor)
- `buildSpineControlPoints()` with X-attraction smoothing
- `sampleCurve()` and `findNearestSample()` (connector attachment)
- `suppressConnector` logic
- 11 unused TIMELINE constants (CONNECTOR_*, SPINE_X_ATTRACTION, SPINE_MAX_X_STEP, SPINE_SAMPLES)

### New code
- `buildSequentialAnchors()` — sorts letters by ID, attaches chronology labels via reverse lookup
- `buildSequentialSpinePoints()` — control points are letter positions in ID order with directional padding

### Files changed
- `src/renderer/groundTimeline.js` — core geometry rework (~110 net lines removed)
- `src/config/constants.js` — thinner TIMELINE radii, removed connector constants
- `docs/agents/shared/01-architecture.md` — updated groundTimeline description
- `docs/agents/shared/02-runtime-flow.md` — updated ground chronology sections

### Files NOT changed
- `src/main.js`, `src/data/provisionalChronology.js`, `src/data/letters.json`, `src/interaction/proximityManager.js`

### Validated
- `npm run build` clean
- `npm run validate:letters` pass with warnings (pre-existing)
- Zero connector/sample/smoothing code references remaining
- API contract preserved: same function signatures, same frameState shape

### Part of
Client request series: movement speed / timeline / audio / landing page (session 3 of 5)

## Session 4 — Landing page

**Date:** 2026-03-20
**Scope:** focused workstream — new UI state and screen

### Behavioral changes
1. New LANDING state added as the first screen the user sees.
2. Four text panels (placeholder content) arranged in corners on desktop, stacked on mobile.
3. "Enter the Archive" CTA in center transitions to loading flow.
4. Cinematic intro and asset loading now deferred until landing page CTA is clicked.
5. Start screen simplified to "Archive Ready" / "The archive is ready." with activation button.
6. Full state flow: LANDING → LOADING → START → ACTIVE.
7. "Read more" toggle on panels when text overflows collapsed height.

### Files changed
- `index.html` — new landing-screen DOM, loading-screen starts hidden, start screen status text simplified
- `src/styles/main.css` — landing page styles (corner grid, shell-panel aesthetic, responsive mobile stacking, entrance animation, reduced-motion, read-more toggle)
- `src/main.js` — LANDING state in UI_STATE enum, initial state change, deferred LoadingScene creation, beginLoadingSequence(), handleEnterFromLanding(), syncLandingContent(), read-more handler, cleanup
- `src/config/landingContent.js` — new file with placeholder panel texts
- `src/config/startShellContent.js` — simplified to "Archive Ready" with empty secondary blocks

### Files NOT changed
- `src/audio/*` — no changes
- `src/renderer/*` — no changes
- `src/interaction/*` — no changes
- `src/config/constants.js` — no changes
- `src/data/*` — no changes

### Validated
- `npm run build` clean
- Landing → Loading → Start → Active flow works
- Mobile responsive layout stacks correctly
- Audio gesture gate preserved (no audio until start screen Enter Archive click)
- All loadingScene references handle null safely

### Part of
Client request series: movement speed / timeline / audio / landing page (session 4 of 5)

## Session 5a — Low-risk production fixes (Day 1)

**Date:** 2026-03-20
**Scope:** four isolated production fixes from audit + orphaned asset cleanup

### Changes
1. Console.log stripping: added `esbuild: { drop: ['console'] }` to vite.config.js for production builds. Dev server retains console output.
2. Animate loop resilience: wrapped animate() body in try-catch so a single frame error doesn't kill the experience. `requestAnimationFrame` stays outside the try-catch to ensure the loop always continues.
3. Null guard on currentSpeedDisplay: prevents throw when debug panel elements are missing (line 1775 was unguarded).
4. Start screen content: added navigation instructions (WASD/mouse/E to inspect) and brief project context line to `startShellContent.js`.

### Files changed
- `vite.config.js` — esbuild console drop for production builds
- `src/main.js` — animate try-catch + currentSpeedDisplay null guard
- `src/config/startShellContent.js` — howToUse and context text

### Validated
- `npm run build` clean (2.31s)
- Zero console.* calls in production bundle (confirmed via grep)
- Both currentSpeedDisplay.textContent references guarded
- requestAnimationFrame outside try-catch, body inside
- Start screen wiring confirmed: syncStartShellContent() shows howToUse and context blocks

### Part of
Production audit Day 1 fixes (session 5a of 2)

## Session 5b — Medium-risk production fixes (Day 1)

**Date:** 2026-03-20
**Scope:** four medium-risk production fixes from audit

### Changes
1. WebGL detection: proactive canvas check before `initScene()` plus try-catch around it. Shows styled `#webgl-fallback` message and halts module execution if WebGL unavailable. `const` destructure changed to `let` (safe — never reassigned).
2. Inspect unlock race fix: replaced `suppressPauseOnNextDesktopUnlock` boolean flag with direct `inspectState.phase !== INSPECT_PHASE.IDLE` check in `handleDesktopUnlock()`. Removed 3 lines of flag logic. Handles ESC during 0.42s inspect transition correctly.
3. Subtitle fallback: improved from "Listening to Letter N…" to "Letter N · [date range]" using chronology data from `provisionalChronology.js`. New `chronologyLabelByLetterId` lookup at module level.
4. Deferred load notification: new `#deferred-load-notice` bar shown when zone 3+ letter loading degrades or fails. Auto-dismisses after 8s. Close button for immediate dismissal. Supplements existing controls-hint and touch-pill surfaces.

### Files changed
- `index.html` — `#webgl-fallback` div, `#deferred-load-notice` div
- `src/styles/main.css` — WebGL fallback styles, deferred load notice styles
- `src/main.js` — WebGL check + initScene try-catch, suppress flag removal (3 sites), subtitle lookup + function, deferred notice function + call site + timer cleanup

### Files NOT changed
- `src/audio/*` — no changes
- `src/renderer/*` — no changes
- `src/interaction/*` — no changes
- `src/config/*` — no changes

### Validated
- `npm run build` clean (2.27s)
- Zero `suppressPauseOnNextDesktopUnlock` references in src/
- `webgl-fallback` present in index.html, main.css, main.js
- `deferred-load-notice` present in index.html, main.css, main.js
- `chronologyLabelByLetterId` present in main.js
- Existing deferred status surfaces (controls-hint, touch pill) unchanged

### Part of
Production audit Day 1 fixes (session 5b of 2)

## Session 5c — Debug panel production gating

**Date:** 2026-03-20
**Scope:** tiny fix

### Changes
- Debug panel (#debug-panel) now auto-shows during `npm run dev` via `import.meta.env.DEV` (Vite built-in, replaced at build time).
- In production: hidden by default, visible with `?debug` in the URL (any value except `?debug=0`). localStorage preference (`hod:debug`) still respected as fallback.
- `?debug` (no value), `?debug=1`, `?debug=true` all activate; `?debug=0` explicitly disables.

### Files changed
- `src/main.js` — `debugUiEnabled` flag updated with `import.meta.env.DEV` + improved URL param parsing (`has()` instead of `=== '1'`)

### Validated
- `npm run build` clean
- `import.meta.env.DEV` absent from production bundle (Vite dead-code elimination confirmed)

### Part of
Production audit Day 1 fixes (session 5c)

## Session 6 — Entry transition quality audit

**Date:** 2026-03-20
**Scope:** focused workstream — three targeted fixes to eliminate perceptible delays and missing spatial cues during the start→active transition

### Behavioral changes
1. Ground timeline (spine + anchors) is now visible from the first frame of ACTIVE state. Previously it required a proximity target (letter within CHECK_RADIUS), which doesn't exist at the spawn position z=-170. The `hasBeenRevealed` one-time latch no longer requires `targetId`.
2. Background theme auto-plays as soon as the MP3 buffer is ready after the landing CTA click, rather than waiting for the "Enter Archive" click. Uses Howler's `onload` callback. Guarded by `isGloballyPaused` and `playing()` to prevent double-play or play during tab-hidden state.
3. `startDeferredLetterLoad()` is deferred to `setTimeout(0)` so the 40-GLB fetch queue setup (~30ms measured) runs as a separate macrotask after the first ACTIVE frame paints. Click handler total dropped from 30.6ms to 0.7ms.
4. DEV-gated `performance.mark/measure` instrumentation added to `handleStartExperience`, `handleDesktopLock`, `syncUiChrome`, and the first animate frame after ACTIVE. Stripped in production builds by Vite.

### Profiling results
- `hol:start-bootstrap`: 0.3ms (negligible)
- `hol:start-audio`: 0.0ms (theme already playing from onload)
- `hol:syncUiChrome`: 0.1-0.4ms (negligible)
- `hol:start-touch-total`: 30.6ms → 0.7ms after setTimeout deferral
- `hol:first-active-frame`: 15-18ms (within 60fps budget)
- Root cause: `startDeferredLetterLoad()` synchronously queuing 40 GLTFLoader instances

### Known edge case
With `html5: true`, Howler streams audio — `onload` fires when enough is buffered to begin playback, not when the full file is downloaded. On very slow networks, the stream could stall mid-playback causing a brief audio gap. This is Howler/browser behavior, not fixable at the application level.

### Files changed
- `src/renderer/groundTimeline.js` — removed `&& targetId` from reveal condition (line 568)
- `src/audio/audioEngine.js` — added `onload` auto-play callback in `prepareBackgroundTheme`
- `src/main.js` — deferred `startDeferredLetterLoad()` to `setTimeout(0)` in both desktop and touch paths; added DEV-gated performance marks
- `docs/agents/shared/02-runtime-flow.md` — updated theme timing and added deferred load coupling row
- `docs/agents/shared/05-constraints.md` — added three new regression patterns
- `docs/agents/shared/changelog.md` — this entry

### Validated
- `npm run build` clean
- Performance marks confirmed stripped from production build
- Touch-emulated Playwright profiling: before/after measurements confirm fix
- No API changes (all changes are internal behavioral)

## Session 7 — v3 meander layout for letter positions

**Date:** 2026-03-20
**Scope:** focused workstream — letter placement data and generator rewrite

### Behavioral changes
1. All 46 letter positions updated to follow a smooth meandering river path instead of random scatter.
2. Zone 3 (letters 7–18) X values are mirrored with smoothstep blending at zone boundaries, creating an S-curve flow between zones 2→3→4.
3. Zone z-ranges expanded: zone 2 now starts at -27, zone 3 at -4, zone 4 extends to 65.
4. Ground timeline CatmullRom spline naturally follows the smoother positions — no changes needed to `groundTimeline.js`.

### Generator rewrite
- `scripts/generate-letter-positions.cjs` replaced random-scatter with deterministic meander algorithm.
- Seeded PRNG (mulberry32, seed=42) for reproducibility.
- Core algorithm: dual-frequency sine centerline with growing amplitude, zone 3 mirror, perpendicular jitter, spacing relaxation.
- `MEANDER_CONFIG` object stores all generation parameters at file top.
- `ZONES` array updated with expanded z-ranges matching new layout.

### Files changed
- `src/data/letters.json` — all 46 position.x and position.z values updated
- `scripts/generate-letter-positions.cjs` — complete rewrite to meander generator
- `docs/agents/shared/03-data-assets.md` — updated zone z-ranges in "Observed dataset shape"
- `docs/agents/shared/changelog.md` — this entry

### Files NOT changed
- `src/renderer/groundTimeline.js` — CatmullRom adapts to new positions automatically
- `src/data/provisionalChronology.js` — zone assignments unchanged
- `src/config/constants.js` — timeline radii/styling unchanged
- `src/main.js` — initialization flow unchanged

### Validated
- `npm run build` clean
- `npm run validate:letters` pass
- Zone counts preserved: 1 / 5 / 12 / 28

## Session 7b — Letter Distribution Tool

**Date:** 2026-03-20
**Scope:** new standalone dev tool for visual letter placement

### What
Single self-contained HTML file (`dev/meander-tool.html`) that the artist/client opens directly in the browser (no server, no build step). Provides:
- Top-down 2D canvas visualization of the XZ plane with zone bands, letter dots, connecting path, and meander centerline
- Full parameter controls: zone Z ranges, path shape (frequency, amplitude, phase, mirror), spacing, seed
- Real-time preview on every slider change
- Stats bar: min pair spacing, violations, sharpest turn, path length
- Export positions JSON, export full config, copy config to clipboard, reset to defaults
- Ghost dots showing previous positions for comparison after regeneration
- Pan/zoom on the canvas

### Algorithm
The tool contains its own JS implementation that exactly matches `scripts/generate-letter-positions.cjs`: same seeded PRNG (mulberry32), same meander centerline, same zone 3 mirror with smoothstep blending, same spacing relaxation. Default config initializes to the checked-in values (seed 42).

### Files created
- `dev/meander-tool.html` — standalone tool (zero external dependencies)

### Files changed
- `README.md` — added "Dev Tools" section
- `docs/agents/shared/changelog.md` — this entry

### Files NOT changed
- `vite.config.js` — `dev/` is not part of the build
- `src/data/letters.json` — tool exports JSON for manual application
- `scripts/generate-letter-positions.cjs` — read for algorithm reference only

### Validated
- `npm run build` clean, `dist/` does not contain `dev/`
- `npm run validate:letters` pass
- Tool opens via `file://` in Chrome, all controls functional

## Session 8 — Narration continuity through inspect mode

**Date:** 2026-03-20
**Scope:** tiny fix — single behavioral change in inspect entry

### Behavioral change
Entering inspect mode (E key / inspect button) no longer restarts the narration from the beginning. Narration continues from the current playhead at full volume throughout the inspect session. On exit, per-frame distance-based volume updates resume smoothly.

### What was removed
- `audioEngine.restartNarration(inspectState.letterId)` call in `enterInspectMode()` — this was the line that sought to the beginning

### What was added
- `audioEngine.activateNarration(inspectState.letterId)` after `clearRuntimeTargeting()` — resumes from the paused position (clearRuntimeTargeting pauses narration via deactivateNarration; activateNarration with the same letter ID hits the fast "resume" path)
- Explicit `currentNarration.volume(AUDIO.NARRATION_VOLUME)` to set full volume on inspect entry, since per-frame distance-based updates are skipped during inspect

### Unchanged paths
- `exitInspectMode()` — no changes needed; when inspect exits, proximity re-acquires the letter and per-frame volume updates resume
- `forceExitInspectMode()` — still works correctly; always paired with `clearRuntimeTargeting()` in pause/unlock handlers, which deactivates narration as expected
- `audioEngine.js` — no changes; `restartNarration` still exists but is no longer called

### Files changed
- `src/main.js` — `enterInspectMode()` body (3 lines changed)
- `docs/agents/shared/02-runtime-flow.md` — section 11 updated
- `.claude/rules/audio.md` — updated inspect/narration rule
- `docs/agents/shared/changelog.md` — this entry

### Validated
- `npm run build` clean
- Zero `restartNarration` references in `src/main.js`

## Session 8b — Remove wireframe edge outlines on active letters

**Date:** 2026-03-20
**Scope:** tiny fix — visual cleanup

### What was removed
The `EdgesGeometry` + `LineSegments` outline cue that appeared as yellow wireframe borders around the active letter's meshes when the player was nearby. These were `active-letter-cue` objects created by `ensureActiveCue()` in `proximityManager.js`, colored amber (`0xffd86b`) at 90% opacity with `depthTest: false`.

### What remains as activation feedback
The emissive tint (`emissive.setHex(0x333333)`) on non-glass meshes, which provides a subtle warm glow when a letter becomes the active target. This is more atmospheric than wireframe edges for the archival experience.

### Source of the wireframe outlines
Code-generated in `proximityManager.js`, not baked into GLB models. The `ensureActiveCue()` function lazily created `EdgesGeometry(mesh.geometry, 20)` wrapped in `LineSegments` with `LineBasicMaterial` for each non-glass mesh child when a letter was first activated. The cue was toggled visible/hidden in `activateLetter()`/`deactivateLetter()`.

### Files changed
- `src/interaction/proximityManager.js` — removed `ensureActiveCue()`, `ACTIVE_CUE_COLOR`, and all `activeCue` visibility toggling. Emissive tint activation/deactivation preserved. Scoring logic untouched.
- `docs/agents/shared/changelog.md` — this entry

### Validated
- `npm run build` clean (JS bundle shrank ~500 bytes from tree-shaking)
- `npm run validate:letters` pass
- Zero `activeCue`, `ensureActiveCue`, `ACTIVE_CUE_COLOR`, or `active-letter-cue` references in src/

## Session 9 — Arabic text mirroring audit

**Date:** 2026-03-20
**Scope:** investigative audit — read-only analysis + visual verification

### Concern
Visual comparison between 3D letter models and scan images raised a concern that Arabic text might be horizontally mirrored on some or all models, making right-to-left text appear left-to-right.

### Investigation approach
1. **Code analysis** — traced the full transform chain from GLB UV coordinates through node rotation quaternions through model rotation.y to world space viewer coordinates.
2. **GLB binary inspection** — extracted UV corner mappings, node quaternions, and embedded textures from representative models (1, 2, 6, 10, 20, 30, 45).
3. **Visual verification** — built `dev/mirror-check.html` comparison tool that renders each GLB's Front and Back meshes using the same material pipeline as `src/renderer/letters.js`, displayed side-by-side with scan images. Checked letters 1, 2, 10, 30, 45 across all four atmosphere zones.

### Findings

**No mirroring detected.** Arabic text displays correctly (right-to-left) on both sides of all tested models.

**No front/back swap detected.** The `Front` GLB node matches the `frontImage` scan, and `Back` matches `backImage`, confirmed by distinctive features (fold line positions, text density patterns, stains).

Key technical details:
- Embedded GLB textures are **byte-identical** to scan JPGs in `public/assets/letters/`
- UV mapping uses inverted U-axis (mesh −X → U=1, mesh +X → U=0) that compensates for the rotation chain
- Front and Back nodes share identical UV coordinates but have different rotation quaternions that correctly orient them on opposite sides of the PlexiFrame
- No runtime texture transforms (repeat, offset, flipY, rotation) are applied anywhere in code
- No CSS transforms (scaleX, mirror) are applied to inspect mode scan images
- All 47 models share the same GLB node structure and quaternion values (±float precision)

### Files added
- `dev/mirror-check.html` — standalone visual comparison tool for future texture orientation audits (served via Vite dev server, excluded from production build)

### Validated
- `npm run build` clean
- Visual comparison confirmed for 5 representative letters across all zones

## Session 10 — 3D orbit inspection sub-mode

**Date:** 2026-03-21
**Scope:** focused workstream across 5 sessions — new orbit viewer within inspect mode

### Behavioral changes
1. Users can now toggle between 2D scan view and 3D orbit view within inspect mode using the T key (desktop) or the 3D/Scan button (touch).
2. In 3D orbit mode: left-drag to rotate the letter model, scroll to zoom (very close zoom supported for reading text), right-drag or arrow keys to pan across the letter when zoomed in, pinch-zoom and two-finger pan on touch.
3. Front/Back side switching and scan zoom are disabled during orbit mode.
4. All force-exit paths (pause, pointer-lock loss, page unload) cleanly hide the orbit viewer.
5. The orbit viewer is lazy-initialized — no WebGL context created until first use.

### State changes
- `inspectState.subMode` added: `'scan'` (default) or `'orbit'` — parallel flag within `INSPECT_PHASE.ACTIVE`, not a new phase
- `orbitInitialized` module-level flag in main.js — persists across inspect sessions
- New DOM: `#inspect-orbit-viewport`, `#inspect-orbit-toggle-btn`

### Design decisions
- **MeshBasicMaterial for letter surfaces** (not MeshStandardMaterial): these are flat scanned documents where the texture IS the content. Lighting-responsive materials cause directional shading that makes text unreadable — one side washes out white, the other goes dark.
- **Isolated viewport** (separate scene/camera/renderer): avoids touching main scene, post-processing, fog, or camera ownership.
- **NoToneMapping** on orbit renderer: ACES tone mapping clips white paper textures to pure white.
- **Viewport must be unhidden before init()**: the container needs non-zero dimensions for canvas sizing. Init order: set subMode → syncInspectUi (unhides viewport) → init → resize → showLetter.
- **Max anisotropy + full device pixel ratio**: texture quality maximized for close-up reading.

### Files created
- `src/renderer/orbitInspect.js` — standalone orbit viewer module (~445 lines)

### Files changed
- `src/main.js` — import, subMode state, toggleInspectSubMode(), key/button handlers, render call, resize, cleanup
- `src/config/constants.js` — INSPECT.ORBIT_FOV, ORBIT_MIN_DISTANCE, ORBIT_MAX_DISTANCE, ORBIT_DAMPING_FACTOR, ORBIT_AUTO_ROTATE_SPEED
- `index.html` — orbit viewport container, toggle button, updated hint text, accessibility attributes
- `src/styles/main.css` — orbit viewport styling, badge variant, responsive breakpoints
- `PLANS.md` — workstream 2D entry
- `docs/agents/shared/01-architecture.md` — subsystem map update
- `docs/agents/shared/02-runtime-flow.md` — inspect orbit sub-mode documentation
- `docs/agents/shared/05-constraints.md` — orbit viewer ownership constraint
- `docs/agents/shared/99-repo-inventory.md` — file inventory update
- `docs/agents/shared/changelog.md` — this entry

### Validated
- `npm run build` clean
- Browser smoke: scan↔orbit toggle, close zoom, pan (arrow keys + right-drag), rotate, exit, force-exit on pause, resize, letter switching
- Arrow key safety verified: OrbitControls gates onKeyDown on this.enabled, dispose() removes window listener
