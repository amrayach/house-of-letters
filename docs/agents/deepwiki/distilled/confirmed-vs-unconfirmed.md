# Confirmed Vs Unconfirmed

This file keeps the DeepWiki layer honest by separating claims that held up under code inspection from claims that did not.

## Confirmed

- `src/main.js` is the top-level orchestrator for scene boot, loading flow, controls, audio startup, proximity-driven UI, and the main animation loop.
- The repo uses a dual loading gate before showing the start screen.
- `src/data/letters.json` is the runtime content source for IDs, positions, zones, and asset paths.
- `public/_headers` and `public/_redirects` are part of the current Cloudflare Pages deployment shape.
- `src/renderer/letters.js` and `src/interaction/proximityManager.js` are real performance-sensitive paths.

## Partially confirmed

- Subtitle text is structurally present in `letters.json`, but all current values are empty and `main.js` still documents the subtitle as mocked/fallback content.
- `scripts/compress-glb.js` is a real optimization script, but its live workflow assumptions are not aligned with the currently populated runtime asset tree.
- The `theme` field is present in data and should be treated as intent metadata, not as a guarantee of current audible behavior.

## Contradicted

- `src/audio/themeMixer.js` is not a real crossfader and does not switch themes by zone.
- `src/renderer/lighting.js` does not create point lights in the current checked-out code.
- `public/3d_sednaya` is a live runtime dependency for the loading intro, not an unused or absent asset area.
- Current runtime audio conventions are not `.wav`-based; the live runtime data and constants point at `.mp3` assets.

## Unknown or not worth carrying forward

- DeepWiki does not add reliable detail about `docs/` ownership beyond acknowledging that the folder exists.
- Any claim not tied to a current owning source file should stay out of the distilled layer until rechecked locally.
