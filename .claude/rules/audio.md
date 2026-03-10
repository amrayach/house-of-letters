# Audio Rules

- `src/audio/audioEngine.js` is the only real audio backend. Keep background theme, narration playback, ducking, pause, resume, and unload behavior there.
- `src/audio/themeMixer.js` is placeholder state, not a real mixer. Do not assume per-letter theme switching already changes audible output.
- Keep narration selection separate from theme playback. Proximity decides narration; global theme playback remains its own concern until a real mixer exists.
- Preserve user-gesture initialization, pause/resume on start or pause transitions, and visibility-change handling so browsers do not block playback unexpectedly.
- Treat richer spatial audio and real theme crossfading as future work unless the task implements them end to end.
