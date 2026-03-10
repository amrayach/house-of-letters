# Interaction Rules

- Keep nearest-letter selection and enter/leave decisions in `src/interaction/proximityManager.js`.
- Keep thresholds and radius values sourced from `src/config/constants.js`; avoid hard-coding new proximity numbers in renderer or UI code.
- Do not duplicate proximity math across audio, renderer, and overlay code. Other layers should react to the active letter instead of recomputing it.
- Keep preview and subtitle updates coupled to the same active-letter state that drives narration and highlight behavior in `src/main.js`.
- If thresholds or activation timing change, validate enter/leave behavior, narration stop/start, and preview/subtitle synchronization.
