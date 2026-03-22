# Interaction Rules

- Keep nearest-letter selection and enter/leave decisions in `src/interaction/proximityManager.js`.
- Keep thresholds and radius values sourced from `src/config/constants.js`; avoid hard-coding new proximity numbers in renderer or UI code.
- Do not duplicate proximity math across audio, renderer, and overlay code. Other layers should react to the active letter instead of recomputing it.
- Audio proximity and visual targeting are separate concerns in `proximityManager.js`. `audioActiveId` (distance-only, no facing) drives narration activation; `activeId` (distance + facing) drives highlight, subtitle, preview, and inspect prompt. Do not re-couple them.
- Keep preview and subtitle updates coupled to visual `activeId` — not `audioActiveId`. The subtitle shows what the user is looking at, not what they are hearing.
- If thresholds or activation timing change, validate enter/leave behavior, narration stop/start, and preview/subtitle synchronization.
