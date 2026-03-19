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
