# Engineering Re-Entry Plan

## Baseline evidence

- Baseline build: `npm run build` passes.
- Current known warning text:
  - `(!) Some chunks are larger than 500 kB after minification.`
  - The current known offender is the `three` chunk.
- Baseline smoke-test evidence in repo memory:
  - earlier plan revisions referenced local `uiux-*` screenshots plus console/network text captures
  - those artifacts are not currently checked into this repo, so treat those references as historical notes rather than reusable proof
  - repeatable proof now comes from source inspection, `npm run validate:letters`, `npm run build` when build-sensitive, and fresh browser/manual smoke checks recorded at checkpoint time

## Current state summary

- The app boots from `index.html` into `src/main.js` and builds successfully for Cloudflare Pages.
- The archive scene, loading intro, GLB letter loading, desktop controls, touch controls, narration playback, preview HUD, and inspect overlay are all present.
- Startup letter loading is now staged in `src/main.js`:
  - zones 1 and 2 are the core subset that gates entry
  - zones 3 and 4 load in the background only after a successful archive entry
- Late-loaded letters now integrate into the live runtime without introducing a new shell state or widening loader ownership.
- The ground chronology thread now initializes only when every chronology-covered letter model is present; it stays disabled when deferred loading settles without full required coverage.
- Deferred degraded or failed late-letter sessions now surface as minimal in-session status only:
  - desktop reuses the controls hint text
  - touch shows a small active-immersive status pill
- The guidance layer under `docs/agents/shared/` is now strong enough to support staged engineering work.
- The runtime ownership model is now consolidated:
  - `main.js` owns shell/UI state and overlay visibility
  - `controls.js` and `touchControls.js` own movement and bird's-eye mechanics
  - `proximityManager.js` owns candidate/active-letter targeting plus highlight/audio trigger handoff
  - `audioEngine.js` owns playback, but only resumes automatically when the shell is active
  - active-letter side effects now evaluate only while the archive is in active play
  - desktop pause/unlock now exits bird's-eye before the paused shell takes over
- The letter readability pass is now implemented:
  - targeting now favors readable-side intent instead of raw nearest-root distance
  - active immersive mode exposes an inspect prompt, reversible inspect camera transition, side switching, and bounded scan zoom
  - inspect suspends live retargeting, suppresses movement/look input, and restores the saved free-walk pose on exit
  - inspect-only quality tuning is limited to a higher pixel-ratio cap plus bounded texture anisotropy
- The loading and start shells now share a small composition polish pass:
  - both shells use the same panel language and spacing rhythm
  - loading now anchors status/progress inside a deliberate content block instead of loose bottom text
  - start now reads as a single focal entry card without changing the underlying state model
- The runtime still has deferred work in theme switching, subtitle content, and asset-pipeline clarity.

## What appears already working

- Intro scene boot and archive scene boot happen in parallel.
- `letters.json` resolves to existing runtime assets.
- GLB loading has retry handling and partial-success tolerance.
- Start availability now depends on the core startup subset rather than waiting for every letter model in the archive.
- Deferred zone 3/4 loading now starts only after archive entry and integrates any successful late loads into the active session.
- Deferred degraded or failed late-letter sessions now keep the active session alive while surfacing minimal status on desktop and touch.
- The ground chronology thread now waits for full chronology coverage and stays absent when deferred loading leaves required letters missing.
- Narration registration, lazy loading, ducking, pause, and resume are implemented in `audioEngine.js`.
- Candidate/active targeting now comes from readable-side metadata, focus helpers, and score-based switching rather than raw nearest-center distance.
- Preview images and subtitle fallback UI are wired into active-letter behavior and stay gated behind active immersive play.
- Inspect mode enters from a valid candidate, supports front/back switching and bounded zoom, and restores the pre-inspect pose on exit.
- Pages deployment files and production build output are in place.

## What appears incomplete or fragile

- `themeMixer.js` is still placeholder-only.
- `letters.json.text` remains empty for all 46 letters.
- `scripts/generate-letter-positions.cjs` still carries older zone-range assumptions and `.wav` fallback defaults.
- The GLB compression script still assumes an empty `public/assets/textures/` source path.
- Scene resize cleanup still lives in `sceneSetup.js` rather than the main runtime cleanup path.

### 1C. Consolidation and ownership hardening

Status:
- Implemented in this pass

Scope:
- keep `main.js` as the single shell/UI visibility owner
- keep touch-control activation separate from touch HUD visibility
- prevent visibility-change audio resume outside `uiState === active`
- keep active-letter overlay content updates and visibility gating in one runtime path

Validation:
- `npm run build`
- smoke-test start -> active -> pause -> resume -> bird's-eye transitions
- confirm bird's-eye does not survive pause/unlock into the next active session
- verify mobile touch state resets on pause/resume
- verify tab hide/show does not resume audio while the shell is paused or at start

Docs to update:
- `PLANS.md`
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md`
- `docs/agents/shared/09-validation-checklist.md`
- `docs/agents/shared/15-ui-ux-reentry.md`
- `docs/agents/shared/16-visual-regression-hotspots.md`

Suggested MCPs/skills:
- `project-health`
- `threejs-interaction`
- `ux-audit`
- `responsiveness-check`

## Workstreams

### 1A. Runtime contract fixes

Status:
- Implemented in this pass

Scope:
- align `main.js` with the current lighting API
- preserve per-letter base orientation and height during sway/bob animation
- centralize active-letter HUD updates in the existing runtime path

Validation:
- `npm run build`
- smoke-test intro completion, active-letter HUD updates, and no new build warnings beyond the known chunk warning

Docs to update:
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md`

Suggested MCPs/skills:
- `threejs-fundamentals`
- `threejs-interaction`
- `threejs-animation`

### 1B. Interaction-state robustness

Status:
- Implemented in this pass

Scope:
- replace emissive-only active highlighting with a material-agnostic cue
- make audio visibility handling idempotent
- ensure control/audio listener cleanup is explicit on unload

Validation:
- `npm run build`
- smoke-test active-letter cue visibility, audio lifecycle behavior, and cleanup path sanity

Docs to update:
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md`

Suggested MCPs/skills:
- `threejs-interaction`
- `threejs-lighting`

### 2. Runtime truth cleanup and asset/data validator

Status:
- Implemented in this pass

Scope:
- refresh README and repo-facing docs so they match current runtime truth
- add a small validator for `letters.json` asset existence/count/path assumptions
- keep validator rules limited to current runtime behavior

Dependencies:
- follow Workstream 1 so docs and validator expectations reflect the stabilized runtime contract

Validation:
- run the validator
- verify README/shared-doc claims directly against local code and data
- `npm run build`

Docs to update:
- `README.md`
- `docs/agents/shared/03-data-assets.md`
- `docs/agents/shared/04-build-deploy.md`
- `docs/agents/shared/06-open-questions.md`
- `docs/agents/shared/09-validation-checklist.md`

Notes:
- `npm run validate:letters` now validates `src/data/letters.json` plus referenced `public/assets/**` files without rewriting anything.
- `npm run validate:letters -- --strict` uses the same validator but promotes warnings to a failing exit code for CI or release gates.
- Current validator findings are:
  - all 46 `text` fields are still empty
  - `public/assets/models/47.glb` is present but unused by runtime data
  - `public/assets/letters/47.jpg` and `public/assets/letters/47-47.jpg` are present but unused by runtime data

Suggested MCPs/skills:
- `project-health`

### 2A. Loading/start composition polish

Status:
- Implemented in this pass

Scope:
- improve loading/start composition only
- preserve `main.js` shell ownership and existing start/pause behavior
- avoid bird's-eye redesign, copy rewrite, or control/state refactors

Validation:
- `npm run build`
- Playwright before/after screenshots for loading and start shells
- confirm loading and start remain visually exclusive with reticle, controls hint, bird's-eye, and mobile pause hidden
- confirm the start shell still scales cleanly at a narrow mobile viewport

Docs to update:
- `PLANS.md`
- `docs/agents/shared/15-ui-ux-reentry.md`
- `docs/agents/shared/16-visual-regression-hotspots.md`

Notes:
- `index.html` keeps the same shell nodes and runtime hooks; only a small wrapper structure was added for composition.
- `src/styles/main.css` now uses a shared shell-panel treatment for loading and start, with no changes to pause ownership or bird's-eye state.

Suggested MCPs/skills:
- `playwright`
- `playwright-cli`
- `frontend-design-codex`

### 2B. Letter inspection and readability workstream

Status:
- implemented across `2B-1` through `2B-4`

Implemented outcome summary:
- movement/readability quick wins landed first
- targeting now exposes a minimal candidate/active contract driven by readable-side metadata
- inspect mode is live on desktop and touch paths, with explicit input suppression and clean exit behavior
- the last quality tuning stayed inspect-only instead of widening the renderer path

Original problem summary:
- Before this workstream, tiny 1:1 letters were hard to inspect because `src/interaction/proximityManager.js` activated the nearest model by raw camera-distance, `src/renderer/controls.js` made fine positioning difficult around the artifacts, `src/main.js` kept nearby letters in motion while the user was trying to read them, and `src/styles/main.css` kept the passive preview too small to carry the readability burden.

Target end-state:
- Preserve free-walk as the default archive mode.
- Preserve the current physical letter scale and the overall atmospheric presentation.
- Let a user approach a letter, understand which letter is in focus, and read it without fighting movement drift or ambiguous selection.
- Keep the implementation architecture-preserving: `main.js` stays the orchestrator, controls own movement math, proximity owns targeting math, and CSS owns preview legibility.

Non-goals:
- do not redesign bird's-eye mode
- do not rewrite loading/start/pause shell flow
- do not change gallery/content/deploy systems
- do not alter `letters.json` content or asset paths
- do not widen into theme-mixer or subtitle-authoring work

File ownership boundaries for this workstream:

| Concern | Primary owner | Notes |
| --- | --- | --- |
| Shell state, active/candidate UI wiring, inspect-state orchestration | `src/main.js` | may coordinate state and DOM only; should not absorb movement or proximity math |
| Movement precision, slowdown, freeze, inspect-entry motion suppression | `src/renderer/controls.js` | remains the only movement owner; keep touch-path implications explicit |
| Candidate and active-letter selection semantics | `src/interaction/proximityManager.js` | may expose candidate/active data, but should not manage DOM or shell visibility |
| Passive preview and inspect UI readability | `index.html`, `src/styles/main.css` | layout and presentation only |
| Letter motion and later render/readability tuning | `src/main.js`, `src/renderer/letters.js`, `src/config/constants.js` | keep per-frame work lean; prefer tuning constants before larger renderer changes |
| Renderer/camera defaults | `src/renderer/sceneSetup.js` | treat as out of scope unless later validation proves renderer settings are still the blocker |

Execution slices:

#### 2B-1. Quick wins: movement precision and passive preview

Status:
- implemented in this pass

Purpose:
- deliver immediate usability gains without changing the core targeting contract

Files to inspect:
- `src/main.js`
- `src/renderer/controls.js`
- `src/interaction/proximityManager.js`
- `src/config/constants.js`
- `src/styles/main.css`

Expected changed files:
- `src/main.js`
- `src/renderer/controls.js`
- `src/styles/main.css`
- maybe `src/config/constants.js`

Success criteria:
- walking precision improves enough that users can stop beside a letter without repeated overshoot
- nearby slowdown or similar assistance stays inside the existing free-walk contract
- the currently relevant letter no longer fights inspection with full ambient motion
- the passive preview becomes materially larger and easier to read on desktop and mobile

Validation:
- `npm run build`
- browser smoke-test: start -> active -> approach first letter cluster -> confirm slowdown/precision improvement
- browser smoke-test: confirm intended motion damping or freeze only near the intended candidate/active letter
- browser smoke-test: confirm enlarged preview remains hidden outside active immersive play
- manual note for pointer-lock feel if automation cannot prove movement quality cleanly

Docs to update with code:
- `PLANS.md`
- `docs/agents/shared/05-constraints.md` only if new movement/readability guardrails are introduced
- `docs/agents/shared/09-validation-checklist.md` only if the validation ladder changes

#### 2B-2. Candidate intent contract

Status:
- implemented in this pass

Purpose:
- replace raw nearest-center activation with a clearer focus/candidate contract before adding inspect mode

Files to inspect:
- `src/main.js`
- `src/interaction/proximityManager.js`
- `src/renderer/controls.js`
- `src/config/constants.js`
- `src/styles/main.css`

Expected changed files:
- `src/interaction/proximityManager.js`
- `src/main.js`
- `src/config/constants.js`
- maybe `src/styles/main.css`

Success criteria:
- candidate selection reflects user intent better than pure distance alone in dense clusters
- passive preview and any slowdown/freeze hooks read from one targeting contract instead of duplicated heuristics
- active-letter side effects still stay gated behind `uiState === active`
- free-walk remains intact; no inspect lock is introduced yet

Validation:
- `npm run build`
- targeted browser checks around tightly spaced letters to confirm the aimed-at letter wins more reliably than a merely closer neighbor
- verify candidate/active transitions clear on exit from proximity, pause, and pointer unlock
- verify no new narration or preview changes happen behind loading/start/pause shells

Notes:
- `src/renderer/letters.js` now stores per-letter local interaction metadata, expanded trigger volumes, per-side focus helpers, and provisional inspect anchors for `2B-3`.
- `src/interaction/proximityManager.js` now scores candidate and active letters from trigger distance, view alignment, readable-side facing, and a collider-based focus bonus instead of raw root-center distance.
- `src/main.js` now clears targeting explicitly outside active runtime state; pause/unlock clears the current target, and resume reacquires only if the camera is still positioned on a valid letter.
- Playwright desktop pointer lock remained blocked in automation, so browser verification used the touch-control path for repeatable movement and targeting checks.

Docs to update with code:
- `docs/agents/shared/01-architecture.md` if ownership between `main.js` and `proximityManager.js` changes
- `docs/agents/shared/02-runtime-flow.md` if the candidate/active lifecycle changes
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md` only if a new unresolved targeting tradeoff appears

#### 2B-3. Inspect mode contract

Status:
- implemented in this pass

Purpose:
- add an explicit, reversible inspect state only after candidate targeting is trustworthy

Files to inspect:
- `index.html`
- `src/main.js`
- `src/renderer/controls.js`
- `src/interaction/proximityManager.js`
- `src/interaction/touchControls.js`
- `src/config/constants.js`
- `src/styles/main.css`

Expected changed files:
- `index.html`
- `src/main.js`
- `src/renderer/controls.js`
- `src/styles/main.css`
- maybe `src/interaction/touchControls.js`
- maybe `src/config/constants.js`

Success criteria:
- a user can intentionally enter and exit inspect mode on the chosen letter
- inspect mode increases legibility without changing world scale or replacing free-walk as the default mode
- movement/look suppression during inspect is explicit, reversible, and does not leak into pause/resume or bird's-eye paths
- desktop and touch affordances are both intentional if touch support is kept in scope

Validation:
- `npm run build`
- browser smoke-test: enter archive, acquire candidate, enter inspect, switch front/back, zoom, exit inspect, resume free-walk
- browser smoke-test: pause/unlock from inspect path and confirm clean return to non-inspect active state
- browser smoke-test: verify bird's-eye and inspect do not overlap in an invalid state
- responsive check for inspect UI at narrow mobile and desktop widths if touch support is implemented

Docs to update with code:
- `PLANS.md`
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/09-validation-checklist.md` only if the validation ladder changes

Notes:
- Desktop inspect is keyboard-driven but releases pointer lock while the inspect overlay is active; touch inspect uses shell-owned overlay buttons.
- Inspect snapshots one `letterId` and one `side` on entry, defaults to `front` if the candidate side is missing, and suspends live retargeting until exit.
- Inspect framing uses per-side metadata, stored inspect anchors, bounded min/max distance clamps, and `PerspectiveCamera.getViewSize()` instead of hard-coded offsets.
- Playwright validation used the touch/emulated-mobile path for repeatable browser checks because desktop pointer lock remained blocked in automation.

#### 2B-4. Residual render/readability tuning

Status:
- implemented in this pass as a bounded inspect-only quality adjustment

Purpose:
- fix only the remaining scene-side legibility issues after movement, targeting, and inspect behavior are settled

Files to inspect:
- `src/main.js`
- `src/renderer/letters.js`
- `src/renderer/sceneSetup.js`
- `src/renderer/lighting.js`
- `src/config/constants.js`

Expected changed files:
- the smallest confirmed subset of:
  - `src/main.js`
  - `src/renderer/letters.js`
  - `src/renderer/sceneSetup.js`
  - `src/renderer/lighting.js`
  - `src/config/constants.js`

Success criteria:
- any remaining readability fix is backed by a specific failure observed after the earlier slices
- atmosphere and performance stay materially consistent with the current archive
- no late-stage renderer tweak reopens movement, targeting, or inspect-state ownership

Validation:
- `npm run build`
- before/after browser screenshots or manual evidence for the exact residual issue being tuned
- console/network smoke check for renderer/material regressions
- targeted readability check on the same letters used in slices 2B-1 through 2B-3

Notes:
- free-walk keeps the existing renderer profile; inspect mode alone now raises the pixel-ratio cap and uses a slightly narrower inspect FOV
- `src/renderer/letters.js` now applies bounded anisotropy to the scanned letter textures instead of changing the whole renderer path
- representative `gltf-transform inspect` and `validate` checks on current GLBs showed tiny quantized geometry and embedded tall JPEG scans as the real payload, with no hard validation errors
- result: no asset recompression or re-export was justified in this pass, and `scripts/compress-glb.js` remains workflow-ambiguous until its source-path assumptions are repaired

Docs to update with code:
- `docs/agents/shared/01-architecture.md` only if renderer ownership shifts
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md` if the residual issue cannot be fully resolved in-scope

Sequencing and fan-out:
- `2B-1` must land before deeper refactors so the smallest reversible usability fixes are measured first.
- `2B-2` must land before inspect mode because it defines the targeting contract that inspect mode will consume.
- `2B-3` is sequential after `2B-2`; after its state contract is stable, inspect-state wiring and inspect UI polish can fan out safely.
- `2B-4` should not start until the first three slices are validated and a specific residual issue remains.

### 3. Subtitle/content maintainability pass

Status:
- queued

Scope:
- reformat `letters.json` for maintainability
- add real subtitle text only if authoritative archival content exists
- do not invent missing content

Dependencies:
- preferably after Workstream 2 so validator and runtime truth docs already exist

Validation:
- verify JSON shape and asset references
- smoke-test subtitle rendering only if text content changes

Docs to update:
- `docs/agents/shared/00-project-overview.md`
- `docs/agents/shared/03-data-assets.md`
- `docs/agents/shared/06-open-questions.md`

Suggested MCPs/skills:
- local reads/tools only

### 4. Theme policy decision and mixer implementation

Status:
- queued

Scope:
- decide whether theme selection is global, per-zone, or per-letter
- only then connect `themeMixer` to `audioEngine`

Dependencies:
- requires a policy decision first

Validation:
- autoplay-safe startup
- narration ducking/recovery
- pause/resume and tab visibility behavior

Docs to update:
- `docs/agents/shared/01-architecture.md`
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/03-data-assets.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md`

Suggested MCPs/skills:
- `threejs-interaction`
- `context7` only if current Howler/browser audio semantics need confirmation

### 5. Loading/performance pass

Status:
- defer until behavior is stable

Scope:
- revisit dual render-loop startup cost
- inspect chunking/log noise/startup smoothness
- do not merge intro/archive ownership without a fresh plan

Dependencies:
- after Workstreams 2 through 4

Validation:
- `npm run build`
- compare chunk output to the captured baseline
- browser smoke-test startup smoothness and console/network noise

Docs to update:
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/04-build-deploy.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/09-validation-checklist.md`

Suggested MCPs/skills:
- `threejs-fundamentals`
- `threejs-loaders`
- `threejs-animation`

## Dependencies and execution order

1. Workstream 1A
2. Workstream 1B
3. Workstream 1C
4. Workstream 2
5. Workstream 2A
6. Workstream 2B-1
7. Workstream 2B-2
8. Workstream 2B-3
9. Workstream 2B-4 if needed
10. Workstream 3
11. Workstream 4
12. Workstream 5

Why this order minimizes rework:
- it resolves confirmed runtime contradictions before adding new behavior
- it updates docs and validator logic after the runtime contract is stable
- it keeps letter-readability quick wins separate from the later targeting and inspect-mode contracts
- it gives inspect mode a defined targeting API instead of forcing UI and selection changes into one pass
- it avoids building theme switching before the soundtrack policy is explicit
- it delays optimization until the behavior being optimized is already settled

## Validation strategy per workstream

- Workstream 1: build first, then targeted runtime smoke-tests for intro/start/active-letter/pause flows plus visibility-driven audio behavior
- Workstream 2: validator plus direct doc-to-code verification
- Workstream 2A: build plus focused shell screenshots/smoke-tests
- Workstream 2B-1: build plus targeted movement/proximity/preview checks
- Workstream 2B-2: build plus dense-cluster targeting checks and shell-gating regression checks
- Workstream 2B-3: build plus inspect enter/exit/pause/bird's-eye/browser-visible checks
- Workstream 2B-4: build plus before/after evidence for the specific residual render/readability issue
- Workstream 3: JSON/data validation plus targeted subtitle checks
- Workstream 4: browser audio lifecycle validation
- Workstream 5: measured startup/build/browser checks against the baseline

## Stop conditions and rollback guidance

- Stop and re-plan if a workstream requires ownership changes across `main.js`, controls, proximity, loading, and audio.
- Stop and re-plan if theme work cannot satisfy autoplay and narration constraints consistently.
- Roll back Workstream 1 behavior changes if they break intro gating, active-letter feedback, or pause/resume behavior.
- Treat `dist/` as generated output during implementation.
- Do not commit regenerated `dist/` artifacts unless the workflow explicitly intends to update build output.

## Docs to update after each workstream

- Boundary or lifecycle changes: `01-architecture.md`, `02-runtime-flow.md`
- Data/path/schema changes: `03-data-assets.md`
- Build/deploy changes: `04-build-deploy.md`
- Guardrails and known regressions: `05-constraints.md`, `06-open-questions.md`
- Validation or tool-routing changes: `09-validation-checklist.md`, `11-14`

## Prioritized backlog

### Must-fix foundations

1. Manual desktop pointer-lock and inspect smoke capture
2. Workstream 3: Subtitle/content maintainability pass

### Safe UX/runtime improvements

1. Bird's-eye shell clarity
2. Replace placeholder subtitle text once authoritative content exists

### Medium-risk architecture work

1. Workstream 4: Theme policy decision and mixer implementation
2. Workstream 5: Loading/performance pass

### Defer for later

1. GLB compression workflow repair
2. Spatial audio / `PannerNode`
3. Bird’s-eye camera redesign
4. Intro/archive lifecycle unification

### 2C. Ground chronology thread

Status:
- Implemented in this pass

Scope:
- add a scene-native grouped chronology thread only
- keep `main.js` as the orchestrator and keep targeting/movement ownership where it already lives
- leave `letters.json` untouched and route provisional labels through a dedicated chronology mapping layer

Validation:
- `npm run build`
- manual smoke for first reveal, ambient roaming persistence, later-zone focus sharpening, pause/resume hiding, inspect-adjacent stability, and bird's-eye hiding

Docs to update:
- `PLANS.md`
- `docs/agents/shared/01-architecture.md`
- `docs/agents/shared/02-runtime-flow.md`
- `docs/agents/shared/03-data-assets.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/06-open-questions.md`
- `docs/agents/shared/09-validation-checklist.md`
- `docs/agents/shared/15-ui-ux-reentry.md`
- `docs/agents/shared/16-visual-regression-hotspots.md`

Notes:
- `src/data/provisionalChronology.js` now owns grouped chronology labels and validates coverage against `letters.json`.
- `src/renderer/groundTimeline.js` now owns the floor spine, per-letter anchors/connectors, and label planes.
- timeline setup disables safely if chronology validation fails or not every covered letter model loads.

## Recommended next task

Manual ground chronology smoke pass.

Why this is next:
- the grouped floor navigation thread is now visible user-facing runtime behavior
- the highest remaining risk is perceptual: whether the thread reads clearly while moving, slowing, pausing, inspecting, and hiding in bird's-eye
- browser automation can help around shell visibility and console cleanliness, but it still cannot fully defend captured-pointer movement feel

Keep the scope tight:
- desktop start -> pointer lock -> first reveal near Letter 1 -> move forward while the thread stays ambient -> slow near a later-zone letter -> inspect -> exit -> unlock/pause -> resume -> bird's-eye hide
- record exactly what was exercised and whether the evidence is stored in-repo or summarized in docs/checkpoint notes

**Next narrow task: Manual grouped chronology smoke pass**

Why:
- smallest remaining gap between implemented runtime truth and defended user-visible evidence
- no feature expansion
- lowers risk before any later copy, bird's-eye, or exact-date work
