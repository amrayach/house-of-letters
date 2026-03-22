# 15. UI/UX Re-entry

## Scope

This track is grounded in the current direct-DOM + Three.js runtime. It does not propose a framework rewrite, a React/Tailwind migration, or a broad scene redesign.

Baseline for this document:

- source of truth is the checked-out repo plus local Playwright walkthroughs
- no Figma frame/node is currently in scope
- the first safe-win pass now covers:
  - shell-state gating
  - desktop pointer-lock recovery
  - pause/resume messaging
  - subtitle and preview layout cleanup
  - loading/start composition polish
  - candidate targeting and inspect-mode readability

## Current UI state summary

- The archive opens with a cinematic loading scene, then hands off to a dedicated start shell.
- Loading and start now share a restrained panel treatment, so title, status, and CTA read as one focal system instead of loose text on a flat veil.
- Startup now loads only the core archive subset first, so the start shell no longer waits for every letter model before entry.
- Deferred zone 3 and 4 loading now begins only after a successful archive entry and integrates late letters into the live session.
- Desktop now keeps HUD, controls hint, bird's-eye panel, and debug UI out of loading and start states.
- Mobile now keeps joystick, look area, and pause affordances out of loading, start, and pause shells until the archive is active.
- Touch HUD visibility is now shell-owned in `main.js` rather than toggled independently inside touch-control activation.
- Pointer-lock entry and re-entry now keep the user in a recoverable shell if pointer capture is denied or interrupted.
- Desktop pause now exits bird's-eye instead of resuming into a leaked top-down camera state.
- Subtitle and letter preview overlays remain tied to active-letter proximity, but their visibility is now shell-gated in one place and their desktop/mobile layouts are less obstructive than the initial baseline.
- Active immersive play now exposes a candidate-driven inspect prompt and a dedicated inspect overlay for full-size front/back scan viewing.
- Active immersive play now also reveals a scene-native grouped chronology thread only when full chronology-required letter coverage exists, then keeps it as an ambient floor guide while roaming.
- Active-letter narration and emphasis are now evaluated only during active runtime, not behind the start or pause shells.
- Deferred degraded or failed late-letter sessions now surface through existing active-state chrome only:
  - desktop appends status to the controls hint
  - touch shows a small status pill only during active immersive play
- Bird's-eye mode remains part of the same runtime, but it now feels more obviously like the next visual mismatch after loading/start were tightened.

## Strongest strengths already present

- The loading sequence now has a clearer composition anchor instead of relying on loose bottom-aligned text.
- The sparse monochrome shell fits the project mood and does not compete with the scene by default.
- The start shell now has one obvious focal block, which makes entry feel more intentional without changing the interaction model.
- The direct DOM overlay model is workable for additive UX polish.
- Proximity-driven subtitle plus preview remains the clearest non-verbal cue for letter focus.
- When chronology coverage is complete, the new ground chronology thread gives the archive a continuous navigational cue without adding new DOM chrome.
- Readability no longer depends on tiny world-space geometry alone; inspect mode provides a reversible full-scan view without changing archive scale.
- Mobile and desktop already branch cleanly at the control layer, which makes targeted shell fixes feasible without architectural churn.

## UI state matrix

| State | Visible overlays | Interactive overlays | Hidden overlays | Input mode | Entry trigger | Exit trigger | Known fragile transitions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `landing` | landing screen (four text panels + CTA) | landing CTA, read-more toggles | loading (hidden), start, pause, reticle, controls hint, bird's-eye, preview, subtitle, mobile controls, touch deferred status, debug | none | initial boot | landing CTA click | double-click on CTA (guarded by hasLeftLanding flag) |
| `loading` | loading scene, loading overlay, skip intro | skip intro | landing (hidden), start, pause, reticle, controls hint, bird's-eye, preview, subtitle, mobile controls, touch deferred status, debug | none | landing CTA click | intro complete + core startup load | double transition scheduling, timeout/error path, LoadingScene needs visible container for renderer dimensions |
| `start` | start shell | start button | pause, reticle, controls hint, bird's-eye, preview, subtitle, mobile controls, touch deferred status, debug | desktop or touch | loading handoff after core startup load | successful activation | desktop pointer-lock denial, mobile shell leakage |
| `active desktop` | reticle, controls hint, subtitle/preview when letter is active | scene, pointer lock | start, pause, mobile controls, touch deferred status | keyboard + mouse | pointer lock acquired | unlock, bird's-eye toggle | pointer-lock interruption, preview collision near scene focal point, degraded-status copy append |
| `active mobile` | pause button, joystick, look area, touch deferred status when degraded, subtitle/preview when letter is active | touch controls, scene | start, pause, desktop HUD, debug | touch | start tap or resume tap | mobile pause | safe-area overlap, preview/subtitle collision, degraded-pill overlap with pause/browser chrome |
| `inspect` | inspect overlay, inspect prompt replacement, scene camera framed on one letter side | keyboard inspect shortcuts on desktop or overlay buttons on touch | start, pause, reticle, controls hint, touch joystick/look HUD, touch deferred status, preview, subtitle | desktop or touch | inspect prompt/button from active immersive play | inspect exit, pause/unlock, invalid state correction | camera restore, bird's-eye exclusion, responsive overlay density |
| `paused desktop` | pause shell | resume button | start, reticle, controls hint, bird's-eye, preview, subtitle, mobile controls, touch deferred status, debug | keyboard + mouse | pointer unlock | pointer lock reacquired | resume failure, stale movement state |
| `paused mobile` | pause shell | resume button | start, pause button, joystick, look area, desktop HUD, debug, touch deferred status, preview, subtitle | touch | mobile pause button | resume tap | touch controls leaking under pause shell |
| `bird-eye` | bird's-eye indicator | scene navigation | start, pause, reticle, controls hint, mobile controls | desktop today | `B` while active | `B` again or pause | panel/system mismatch, keyboard state persistence |
| `active-letter emphasis` | subtitle + preview | none today | unrelated shells | desktop or touch | proximity threshold enter | proximity threshold exit | layout overlap, missing copy fallback quality |

## Top 6 UI/UX issues

1. ~~Bird's-eye mode still feels like a tool overlay rather than a first-class archive view.~~ Resolved — now uses monochrome glass badge matching the archive palette.
2. Subtitle fallback copy remains generic when letter text is missing.
3. Preview and subtitle layout are improved but still scene-obstructive on smaller phones, especially in degraded sessions that also show the touch status pill.
4. ~~Pause messaging is clearer, but shell copy overall still under-orients first-time users.~~ Pause now uses glass panel with kicker/title hierarchy matching other shells. Broader copy orientation remains a separate concern.
5. Debug UI policy is now enforced in shell states, but it still depends on a runtime flag rather than a stricter environment boundary.
6. Overlay behavior is now explicit, but regression risk remains high because the runtime still combines DOM shell logic with an always-running render loop.

## Pain points by severity

### High

- ~~Bird's-eye presentation is visually detached from the rest of the archive shell.~~ Resolved — redesigned as monochrome glass badge with archive palette.
- Mobile overlay density is still tight in active-letter moments on small screens, especially when the degraded touch-status pill is present.
- Placeholder subtitle fallback weakens narrative credibility.

### Medium

- ~~Pause screen lacked glass panel treatment.~~ Resolved — now uses `.shell-panel` with `::before` glow, matching landing/loading/start.
- Start and pause copy still explain controls more than atmosphere or intent.
- Letter preview cards remain visually heavier than the subtitle layer they support.
- Overlay logic is correct now, but fragile because it spans HTML, CSS, `src/main.js`, and control-layer events.

### Low

- Desktop HUD typography can be tuned once the next visual pass begins.
- The debug panel still looks like a dev overlay even when explicitly enabled.

## Prioritized improvement opportunities

### P0. Keep shell-state gating as the source of truth

- Preserve explicit `loading`, `start`, `active`, and `paused` shell states.
- Keep HUD, touch controls, bird's-eye indicator, debug UI, and active-letter overlays state-gated.
- Keep `syncUiChrome()` as the only visibility owner for those overlays.
- Do not reintroduce inline `display` toggles scattered across handlers.

Validation:
- Playwright smoke for loading, start, active, pause, and mobile resume flows.

Figma:
- no

### P1. Improve content clarity without changing architecture

- Replace generic subtitle fallback content where real text is unavailable.
- Refine start/pause copy for orientation, recovery, and emotional tone.
- Add clearer microcopy for bird's-eye entry and exit.

Validation:
- Desktop and mobile first-run walkthroughs with copy review in-context.

Figma:
- no

### P1. Reduce active-letter obstruction further on mobile

- Keep subtitle width narrow enough to preserve focal context.
- Make preview cards slightly lighter and more subordinate to the scene.
- Preserve safe-area spacing for pause, control affordances, and the degraded touch-status pill.

Validation:
- Proximity test at mobile widths around the first active letter cluster.

Figma:
- no

### P2. Loading/start composition follow-through

- The narrow panel-based composition pass is now in place.
- Keep future changes limited to copy refinement or minor responsive tuning.
- Do not reopen shell ownership or re-center this track around a larger redesign.

Validation:
- Before/after screenshot comparison plus shell-exclusivity checks at desktop and narrow mobile widths.

Figma:
- not required for incremental follow-through

### ~~P2. Unify bird's-eye and active-letter visual language~~ (Resolved)

Bird's-eye indicator now uses the same glass panel tokens (`--shell-panel-bg`, `--shell-panel-border`) and monochrome palette as the rest of the archive. Green accent, emoji, Material Design zone colors, and raw coordinates removed.

## Recommended order of implementation

1. Keep the current shell-state matrix stable and extend from it instead of bypassing it.
2. Improve copy and fallback text.
3. Continue mobile active-letter layout tuning.
4. ~~Rework bird's-eye into the same visual system as the rest of the archive.~~ Done.

## First-pass acceptance criteria

The first UX pass is complete only if:

- no HUD, debug UI, or touch controls leak into loading or start shells
- pause state is visually exclusive on desktop and mobile
- pointer-lock denial or interruption leaves the user in a recoverable shell
- subtitle and preview remain readable without excessively blocking the focal scene
- no new z-index or overlap regressions appear in tested desktop/mobile flows

## Desktop vs mobile notes

### Desktop

- Pointer-lock recovery is the main UX risk and must stay explicit.
- The controls hint should appear only in active immersive mode.
- Bird's-eye currently belongs to desktop-first review and should not be treated as a mobile parity gap yet.

### Mobile

- Touch controls must stay absent until active play begins.
- Safe-area spacing is part of the UX contract, not polish.
- Active-letter overlays need conservative sizing because the scene already shares space with joystick, look zone, and pause affordances.
- The degraded touch-status pill should appear only in active immersive touch sessions and must stay clear of the pause button and browser chrome.

## Improvements that need Figma vs do not

### Does not need Figma

- shell-state gating
- pointer-lock recovery
- touch HUD visibility rules
- subtitle/preview positioning
- copy improvements
- debug UI policy

### Better with Figma, but not blocked on it

- bird's-eye visual-system redesign
- future typography or spacing-system refreshes

## Debug UI policy

- Debug UI is hidden by default in user-facing flows.
- Debug UI should never be visible during loading, start, pause, or other shell states.
- If used, it should be enabled only through an explicit debug flag or debug session rule.

## Top 3 safe wins

1. State-gate overlays and touch HUD by mode.
2. Repair pointer-lock re-entry and pause/resume messaging.
3. Reposition and resize subtitle and preview layers, especially on mobile.

## Top 2 medium-risk visual improvements

1. ~~Unify bird's-eye and active-letter panels into a more coherent overlay language.~~ Done.
2. Refine first-time orientation copy/layout without changing the DOM architecture.
