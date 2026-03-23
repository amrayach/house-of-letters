# Audio Rules

- `src/audio/audioEngine.js` is the only real audio backend. Keep background theme, narration playback, ducking, pause, resume, and unload behavior there.
- `src/audio/themeMixer.js` owns the dual-theme crossfade: theme A (zones 1-2) and theme B (zones 3-4) crossfade based on camera z-position via `THEME_CROSSFADE_START` / `THEME_CROSSFADE_END` constants.
- `audioEngine.js` manages both theme Howls (`themeA`, `themeB`), their base volumes (set by the mixer), ducking (applied on top of base volumes), and pause/resume/dispose.
- Keep narration selection separate from theme playback. Proximity decides narration; theme crossfade is driven by camera position, not letter selection.
- Preserve user-gesture initialization, pause/resume on start or pause transitions, and visibility-change handling so browsers do not block playback unexpectedly.
- Narration activation is driven by distance-only audio proximity (`audioActiveId` in `proximityManager.js`), independent of visual targeting (viewDot/facingDot). Turning away from a letter does not stop its narration.
- Narration uses distance-based volume: `activateNarration` resumes or starts, `deactivateNarration` pauses (preserving playhead), `restartNarration` seeks to 0 (available but not currently used), `setNarrationVolume` is called per-frame from `main.js` using `audioActiveId`.
- Inspect mode does not interrupt narration. On entry, `activateNarration` resumes at the current playhead after `clearRuntimeTargeting` pauses it, then volume is set to full. On exit, per-frame volume updates resume.
- Per-frame volume uses `currentTargetState.audioActiveId` (not visual `activeId` or `audioEngine.currentNarrationLetterId`) to ensure `deactivateNarration` pause is not immediately overridden by auto-resume and volume is computed from distance to the correct letter.
- `setNarrationVolume` auto-pauses at volume 0 and auto-resumes at volume > 0. It also scales background theme volume proportionally (inverse of narration volume).
- `isGloballyPaused` prevents per-frame volume updates from interfering with the pause screen and visibility handler. It is set in `pause()`, cleared in `resume()` and `dispose()`.
- In single-narration mode (`POLYPHONIC_MODE=false`): only one narration Howl may be playing/unpaused at any time.
- In polyphonic mode (`POLYPHONIC_MODE=true`): multiple narration Howls play simultaneously at distance-weighted volumes. `activeNarrations` Set tracks which are playing. Theme ducks based on loudest narration (`Math.max`). `activatePolyphonicNarration` uses `activeNarrations.has()` membership check (not a token counter) to guard against stale async loads.
