# Engineering Re-Entry Plan

## Baseline evidence

- Baseline build: `npm run build` passes.
- Current known warning text:
  - `(!) Some chunks are larger than 500 kB after minification.`
  - The current known offender is the `three` chunk.
- Baseline smoke-test evidence available in-repo:
  - `uiux-loading-screen.png`
  - `uiux-start-screen.png`
  - `uiux-mobile-preview-subtitle.png`
  - `uiux-mobile-pause-screen.png`
  - `uiux-console.txt` reports `Errors: 0, Warnings: 0`
  - `uiux-network.txt` shows successful `200` responses for Sednaya assets and `1..46` GLB model requests

## Current state summary

- The app boots from `index.html` into `src/main.js` and builds successfully for Cloudflare Pages.
- The archive scene, loading intro, GLB letter loading, desktop controls, touch controls, narration playback, and preview HUD are all present.
- The guidance layer under `docs/agents/shared/` is now strong enough to support staged engineering work.
- The runtime ownership model is now consolidated:
  - `main.js` owns shell/UI state and overlay visibility
  - `controls.js` and `touchControls.js` own movement and bird's-eye mechanics
  - `proximityManager.js` owns active-letter detection plus highlight/audio trigger handoff
  - `audioEngine.js` owns playback, but only resumes automatically when the shell is active
  - active-letter side effects now evaluate only while the archive is in active play
  - desktop pause/unlock now exits bird's-eye before the paused shell takes over
- The runtime still has deferred work in theme switching, subtitle content, and asset-pipeline clarity.

## What appears already working

- Intro scene boot and archive scene boot happen in parallel.
- `letters.json` resolves to existing runtime assets.
- GLB loading has retry handling and partial-success tolerance.
- Narration registration, lazy loading, ducking, pause, and resume are implemented in `audioEngine.js`.
- Preview images and subtitle fallback UI are wired into active-letter behavior.
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
5. Workstream 3
6. Workstream 4
7. Workstream 5

Why this order minimizes rework:
- it resolves confirmed runtime contradictions before adding new behavior
- it updates docs and validator logic after the runtime contract is stable
- it avoids building theme switching before the soundtrack policy is explicit
- it delays optimization until the behavior being optimized is already settled

## Validation strategy per workstream

- Workstream 1: build first, then targeted runtime smoke-tests for intro/start/active-letter/pause flows plus visibility-driven audio behavior
- Workstream 2: validator plus direct doc-to-code verification
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

1. Workstream 4: Theme policy decision and mixer implementation

### Safe UX/runtime improvements

1. Workstream 3: Subtitle/content maintainability pass

### Medium-risk architecture work

1. Workstream 5: Loading/performance pass

### Defer for later

1. GLB compression workflow repair
2. Spatial audio / `PannerNode`
3. Bird’s-eye camera redesign
4. Intro/archive lifecycle unification

## Recommended next workstream

Workstream 3: Subtitle/content maintainability pass.

Why this is next after Workstream 2:
- the repo truth and validator contract are now explicit, so content work can happen against a stable baseline
- all 46 `text` fields still fall back to placeholder subtitle copy, which is the most visible remaining content gap
- the validator is already in place to keep subtitle/data edits low-risk
- if position regeneration becomes part of that pass, review `scripts/generate-letter-positions.cjs` first because its bounds/defaults lag the live dataset

**Workstream 3: Subtitle/content maintainability pass**

Why:
- highest visible content impact without reopening the runtime hot path
- low risk now that runtime truth and validation are documented
- easy to validate locally
- it prepares later theme and asset-pipeline decisions with cleaner content data
