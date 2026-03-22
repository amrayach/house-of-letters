# 05. Constraints

## Hard runtime boundaries

- Keep `src/main.js` as the orchestrator.
  - It may coordinate subsystems and DOM.
  - It should not absorb loader internals, audio internals, or touch-control internals.
  - It is the source of truth for shell/UI state and overlay visibility.
- Keep `src/renderer/loadingScene.js` isolated from archive gameplay logic.
  - It owns the intro renderer/composer only.
- Keep `src/renderer/controls.js` and `src/interaction/touchControls.js` as the only movement/input owners.
  - They may enable or disable input.
  - They should not become the primary owners of start/pause shell visibility or active-letter HUD visibility.
- Keep `src/interaction/proximityManager.js` responsible for active-letter detection.
  - It may trigger highlight and narration handoff.
  - It should not manage DOM preview or subtitle visibility.
  - It should not start new active-letter side effects behind non-active shell states.
  - Its public seam should stay minimal: candidate/active IDs, sides, and scores only.
- Keep `src/renderer/groundTimeline.js` responsible for scene-native chronology rendering only.
  - It may build grouped floor meshes and labels.
  - It should not own shell state, movement state, or targeting decisions.
  - It should consume frame state from `main.js` rather than reading controls or proximity internals directly.
- Keep `src/renderer/orbitInspect.js` as the isolated orbit viewer owner.
  - It must own its own WebGL context, scene, camera, and OrbitControls — never share the main renderer or camera.
  - The orbit viewport container (`#inspect-orbit-viewport`) must be unhidden before `init()` is called — the container needs non-zero dimensions for canvas sizing.
  - It should not absorb DOM visibility, shell state, or inspect phase management — those stay in `main.js`.
- Keep `src/audio/audioEngine.js` as the only real audio backend.
  - It may react to visibility changes.
  - It should not decide on its own that paused or start-shell runtime states are allowed to resume.
- Treat `src/audio/themeMixer.js` as placeholder until it actually controls playback.
- Treat `src/data/letters.json` as declarative content, not a runtime state cache.
- Do not back-fill speculative chronology fields into `src/data/letters.json` while exact per-letter dates are still unavailable.
- Letter z-positions are temporally meaningful: each paper's z reflects its anchor date relative to paper 1. Do not add z-jitter, randomize z-positions, or redistribute z evenly within zones — this would destroy the temporal signal. X-positions (meander) are not temporally meaningful and can be jittered or redesigned independently.

## Performance-sensitive areas

- `src/main.js` `animate()`
  - already does control updates, DOM writes, proximity checks, per-letter motion, and rendering every frame
  - do not add expensive allocations, extra scene traversals, or broad DOM queries here without a measured reason
- `src/renderer/letters.js`
  - initial model traversal/material replacement happens for every loaded GLB
  - changes here affect boot time and runtime memory
- `src/renderer/loadingScene.js`
  - postprocessing, particles, dynamic lights, and a second render loop already make load-time GPU pressure high
- Asset weight
  - GLBs, MP3s, and JPGs dominate bandwidth and startup cost more than the JS bundle does
- Touch UI
  - injected DOM + per-touch handlers should stay lightweight

## Likely regressions

- Breaking the `assetsLoaded && loadingSceneComplete` gate and trapping the user on loading/start screens
- Starting the LoadingScene or asset loading before the landing CTA is clicked — the landing page must be instant with no GPU-heavy work
- Running `beginLoadingSequence()` synchronously in the same frame as the landing fade-out — the `new LoadingScene()` constructor blocks the main thread for 100-300ms, freezing the CSS fade animation. It must be deferred by 2 `requestAnimationFrame` calls after setting `landingScreen.style.opacity = '0'`. This is a recurring regression.
- Creating the LoadingScene while `#loading-screen` is still hidden — the container needs non-zero dimensions for the renderer
- Starting audio before a user gesture and losing playback on mobile/Chrome/Safari
- Regressing pointer-lock pause/resume while fixing mobile controls, or vice versa
- Letting bird's-eye survive pause/unlock and re-enter the archive in the wrong camera mode
- Reintroducing split ownership where touch controls toggle joystick/look visibility independently of shell state
- Letting `visibilitychange` resume audio while the runtime is in `start` or `paused`
- Letting proximity evaluation trigger narration or letter activation behind loading, start, or pause shells
- Letting stale async narration loads start after proximity was cleared or switched to another letter
- Letting per-frame `setNarrationVolume` use `audioEngine.currentNarrationLetterId` instead of `currentTargetState.activeId` — the former would auto-resume narrations that `deactivateNarration` just paused
- Letting per-frame `setNarrationVolume` run during non-IDLE inspect phases — inspect sets full volume via `restartNarration`, per-frame updates must not override it
- Letting candidate scoring drift back to raw root-center distance and ignoring readable-side metadata
- Letting focus scoring depend on display-mesh raycasting instead of the dedicated side colliders
- Regressing readable-side normals back to averaged display-mesh normals when `Front` and `Back` node transforms are present
- Growing the targeting return shape beyond candidate/active ID, side, and score without a documented consumer and ownership review
- Letting inspect-mode suppression fail so movement, look, or bird's-eye toggles still mutate the camera while inspect is active
- Letting pause, unlock, or resume skip the forced inspect exit and restore the wrong camera pose/state
- Letting the ground chronology thread leak into loading, start, pause, or bird's-eye states
- Letting dense zone 4 promotion turn into multiple readable floor labels at once
- Letting chronology rendering imply exact per-letter dates instead of grouped labels
- Renaming asset paths without updating `letters.json` and intro paths
- Assuming `theme` changes affect audible behavior today
- Breaking the non-glass active-state emissive tint while changing letter materials or mesh naming
- Forgetting that `animate()` should sway around stored base rotation/height instead of overwriting them absolutely
- Removing the ground timeline `hasBeenRevealed` one-time latch or the `isHidden` per-frame visibility gate without understanding both are needed
- Auto-playing theme before AudioContext is resumed from a user gesture (the landing CTA gesture unlocks audio for the session)
- Moving `startDeferredLetterLoad()` back onto the synchronous click/lock handler path — it was deferred to `setTimeout(0)` because queuing 40 GLB fetches costs ~30ms
- Moving `loadingScene.dispose()` back onto the visual-critical transition path — it was deferred to `requestIdleCallback` because synchronous disposal of ~50 GPU resources causes a visible freeze during the Loading → Start crossfade
- Removing the `isTransitioningOutOfLoading` or `isTransitioningOutOfStart` guards from `syncUiChrome` — these prevent the state machine from instant-hiding the start screen during CSS opacity transitions
- Showing the start screen AFTER hiding the loading screen instead of before — the crossfade relies on z-index stacking (loading 2000 on top of start 1000) so start must be unhidden first
- Removing `groundTimeline.preWarm()` from `transitionToGame()` — the pre-warm uploads ~48K triangles of timeline geometry to GPU during the start screen phase; without it, the first ACTIVE frame pays the upload cost as a visible hitch

## Cloudflare Pages routing constraints

- `_redirects` is processed top-to-bottom, first match wins. Rule ordering is deployment-critical.
- The listener page uses directory-based routing (`public/listen/index.html`) — no `_redirects` rule needed for it. Cloudflare Pages serves directory `index.html` files natively before falling through to `_redirects`.
- Any new non-SPA route must be added above the `/*` catch-all, never below it.
- `_headers` rules are additive (not first-match), so ordering within `_headers` is less critical than in `_redirects`.

## Domain and CI constraints

- Production domain is `https://www.houseofdreams.space/` — verify after any domain-referencing edit.
- CI must pass before merging to main. It runs `validate:letters --strict`, `build`, dist file verification, `_redirects` ordering check, and domain correctness check.
- CI also verifies no occurrences of the wrong domain `houseofdreams.site` reach the build output.

## Asset-heavy path handling

- Never mass-edit `dist/**`.
- Prefer in-place asset replacement over file renames.
- If you must rename or move assets:
  1. update `src/data/letters.json`
  2. update any hard-coded intro paths under `src/renderer/loadingScene.js`
  3. re-check `public/_headers`
  4. verify existence paths before browser testing
- Treat `public/assets/textures/` as workflow-ambiguous until the compression script is fixed.

## When docs must be updated with code

Update the shared docs when any of these change:

- `src/main.js` import graph or orchestration order
- ownership of rendering, controls, loading, audio, or proximity
- `letters.json` schema, asset naming conventions, or zone layout assumptions
- Vite aliases, `publicDir`, build output, or script behavior
- Cloudflare Pages routing/header files
- tool-routing expectations in `docs/agents/shared/11-tool-routing.md`
- validation or peer-review guidance in `docs/agents/shared/09-validation-checklist.md`

Minimum doc targets:

- boundary change -> `01-architecture.md`
- sequencing/state change -> `02-runtime-flow.md`
- data/path/schema change -> `03-data-assets.md`
- build/deploy change -> `04-build-deploy.md`
- new guardrail or regression pattern -> `05-constraints.md`
- unresolved gap introduced -> `06-open-questions.md`
- validation/process change -> `09-validation-checklist.md`
- tool/handoff/skill routing change -> `11-tool-routing.md`, `12-cross-agent-handoffs.md`, `13-skill-activation-matrix.md`, or `14-agent-tool-conventions.md`

## Validation additions for this repo

Use `docs/agents/shared/09-validation-checklist.md` as the default checklist. For this repo, add these task-specific checks:

- After data/config edits: verify import/path usage with `rg`, check asset existence against `letters.json`, and inspect for stale README/shared-doc claims.
- After renderer/audio/input changes: run `npm run dev` when feasible and smoke-test intro skip/completion, start/pause handoff, the affected desktop or mobile control path, proximity-driven narration/preview behavior, and tab hide/show audio gating.
- After ground chronology changes: verify first reveal near the earliest letter, ambient persistence while moving, single-label promotion near a later-zone letter, pause/resume hiding, inspect-adjacent stability, and bird's-eye hiding.
- After shell/control changes that touch bird's-eye or active-letter flow: verify pause/unlock exits bird's-eye and that new narration does not start until the runtime is active.
- After targeting changes: verify the intended looked-at letter wins in dense clusters, off-axis neighbors do not steal activation, and pause/unlock clears targeting before any later reacquisition.
- After inspect changes: verify candidate prompt visibility, enter/front/back/zoom/exit behavior, and forced inspect exit on pause/unlock; treat live desktop pointer-lock coverage as manual smoke if automation cannot prove it.
- After Vite or Pages changes: run `npm run build`, confirm `dist/_headers` and `dist/_redirects`, and smoke-test SPA fallback plus GLB/MP3 responses.
- Use Playwright only when the behavior is browser-only, such as overlay flow, pointer lock, touch HUD layout, or deployed routing/header behavior that needs console or network evidence.
