# Audio Rules

- `src/audio/audioEngine.js` is the only real audio backend. Keep background theme, narration playback, ducking, pause, resume, and unload behavior there.
- `src/audio/themeMixer.js` is placeholder state, not a real mixer. Do not assume per-letter theme switching already changes audible output.
- Keep narration selection separate from theme playback. Proximity decides narration; global theme playback remains its own concern until a real mixer exists.
- Preserve user-gesture initialization, pause/resume on start or pause transitions, and visibility-change handling so browsers do not block playback unexpectedly.
- Narration uses distance-based volume: `activateNarration` resumes or starts, `deactivateNarration` pauses (preserving playhead), `restartNarration` seeks to 0 (inspect mode only), `setNarrationVolume` is called per-frame from `main.js`.
- Per-frame volume uses `currentTargetState.activeId` (not `audioEngine.currentNarrationLetterId`) to ensure `deactivateNarration` pause is not immediately overridden by auto-resume.
- `setNarrationVolume` auto-pauses at volume 0 and auto-resumes at volume > 0. It also scales background theme volume proportionally (inverse of narration volume).
- `isGloballyPaused` prevents per-frame volume updates from interfering with the pause screen and visibility handler. It is set in `pause()`, cleared in `resume()` and `dispose()`.
- Only one narration Howl may be playing/unpaused at any time.
