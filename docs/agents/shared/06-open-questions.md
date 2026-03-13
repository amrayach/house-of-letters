# 06. Open Questions

## Incomplete or placeholder areas

| Area | Current observation | Why it matters |
| --- | --- | --- |
| Theme switching | `src/audio/themeMixer.js` only logs/state-tracks active letter IDs | `letters.json.theme` looks meaningful but does not currently change playback |
| Subtitle content | all `letters.json.text` fields are empty | preview UI always falls back to placeholder text |
| Exact chronology | the ground chronology thread is now grouped-only via `src/data/provisionalChronology.js` | later exact per-letter dates should replace only the data seam, not force renderer ownership changes |
| Active-state art direction | active letters now use an outline cue plus optional emissive tint | behavior is visible, but the final visual language may still need tuning |
| Cleanup completeness | core control/audio listener cleanup is explicit now, but disposal still spans `main.js`, `sceneSetup.js`, and `loadingScene.js` | lifecycle responsibilities are improved, not fully unified |
| Real-device degraded touch status | the minimal touch deferred-status pill is implemented, but physical iOS/Android degraded sessions are still manual-only evidence | safe-area overlap, browser chrome overlap, and pause/inspect hide-show need real-device confirmation |
| Data-generation drift | `scripts/generate-letter-positions.cjs` still uses older zone bounds and `.wav` fallback defaults | rerunning it could produce output that disagrees with the current runtime data contract unless it is reviewed first |
| Asset inventory drift | `public/assets/models/47.glb`, `public/assets/letters/47.jpg`, and `public/assets/letters/47-47.jpg` are unreferenced by runtime data | decide whether they are future content or stale files before tightening the archive asset pipeline further |

## Unresolved architecture questions

1. Should theme selection be per letter, per zone, or globally fixed?
2. Should archive letters remain unlit/unshaded (`MeshBasicMaterial`) for readability, or should lighting/highlight become more physically meaningful again?
3. Should the archive renderer really run behind the loading screen, or should it start only after the intro?
4. Should bird's-eye mode continue mutating the same camera, or should it become a separate camera/state machine?
5. Should the intro and archive scenes share more lifecycle code, or is the split a deliberate isolation boundary worth preserving?

## Resolved by the consolidation pass

- Shell/UI visibility ownership is no longer an open question.
  - `src/main.js` is the source of truth for loading/start/pause shells, HUD visibility, touch HUD visibility, and active-letter overlay visibility.
- Touch input activation vs touch HUD visibility is no longer intentionally duplicated.
  - `TouchControls` owns touch state; `main.js` owns when the joystick/look UI is visible.
- Audio visibility behavior is no longer allowed to resume outside active runtime state.
  - `audioEngine` handles the browser event; `main.js` provides the resume gate.
- Active-letter side effects no longer start behind inactive shells.
  - `proximityManager` still owns activation, but `main.js` only lets it evaluate while the archive is active.
- Desktop pause no longer preserves bird's-eye as a hidden leaked state.
  - `controls.js` owns bird's-eye mechanics; `main.js` forces exit before the paused shell takes over.
- Startup no longer waits for every archive letter before entry.
  - `main.js` now loads zones 1 and 2 as the core subset, then moves to `start` once that core load and the intro both complete.
- Deferred letter loading ownership is no longer open.
  - `main.js` starts one background load for zones 3 and 4 only after successful archive entry on desktop or touch.
- Late-loaded letters now integrate into the live runtime instead of remaining startup-only.
  - `integrateLateLoadedLetters(...)` deduplicates them and feeds them into `proximityManager.addLetters(...)`.
- Ground chronology initialization is no longer assumed to be startup-only.
  - `main.js` retries timeline initialization after deferred integration and keeps it disabled when required chronology coverage stays incomplete.
- Deferred degraded or failed handling is no longer missing.
  - desktop reuses the controls hint, and touch now has a small active-immersive status pill sourced from the same deferred-load state.

## README corrections now in place

- README now reflects the current Howler-based audio engine instead of describing `/src/audio` as placeholder-only.
- README now describes the existing GLB letter runtime rather than future placeholder-box replacement work.
- README now documents `npm run validate:letters`, optional strict mode, root-absolute public asset paths, and the current known data/pipeline gaps.

## Risks to check before major refactors

1. Audio lifecycle risk
   - autoplay/user-gesture constraints still govern when audio may start
   - desktop pointer lock and mobile touch paths pause/resume differently
   - tab visibility should never revive audio while the shell is at `start` or `paused`
2. Material/lighting risk
   - readability, highlight behavior, and performance all depend on current material replacement choices
3. Asset-path risk
   - root-absolute public paths, Pages headers, and JSON references are tightly coupled
4. Intro/runtime sequencing risk
   - the current dual-gate transition, staged startup/deferred loading split, and double-render-loop boot sequence are easy to break accidentally
5. Data contract risk
   - `letters.json` looks richer than the current runtime actually uses; changing it can create false assumptions
6. Mobile-safe degraded-status risk
   - healthy sessions may never expose the touch pill, so real-device layout and visibility regressions can hide until a forced degraded path is tested

## Recommended order for tackling them

1. Add real subtitle/text content to `letters.json` when authoritative source text is available.
2. Decide the intended soundtrack policy, then either implement real theme mixing or remove misleading `theme` expectations from docs/data.
3. Review `scripts/generate-letter-positions.cjs` before it is used again so its zone bounds and fallback extensions match the live data contract.
4. Decide whether the archive render loop should start behind the intro.
5. Fix the GLB compression pipeline path assumptions and document the intended asset workflow.
6. Run real-device degraded-session smoke for the touch status pill before widening mobile HUD work.
7. Only after those decisions, do deeper refactors of controls, renderer lifecycle, or data layout.

## Good candidate follow-ups after this doc pass

- Add real subtitle/text content to `letters.json`.
- Replace grouped chronology labels with exact per-letter chronology only when authoritative dates exist.
- Align `scripts/generate-letter-positions.cjs` with the checked-in zone spread and `.mp3` defaults before regenerating data.
- Decide whether `theme` stays in the content contract before implementing real theme mixing.
- Capture physical iOS Safari and Android Chrome evidence for the degraded touch-status pill before any broader mobile HUD polish.
