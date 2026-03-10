# Mismatches Vs Code

Use one block per claim. Keep the field labels stable so future refreshes remain diff-friendly.

## Entry 1

### DeepWiki claim

- `src/audio/themeMixer.js` is responsible for crossfading background themes based on the active letter zone.

### Code evidence checked

- `src/audio/themeMixer.js` only stores `currentTheme`, logs `Crossfading to theme for letter`, and contains a comment placeholder for future logic.
- `src/main.js` starts one background theme through `audioEngine.playBackgroundTheme(AUDIO.THEME_PATH)`.
- `src/main.js` passes `activeLetterId` into `themeMixer.update(activeLetterId)`, not a zone value.

### Status

- contradicted

### Action needed

- Keep docs explicit that theme mixing is placeholder-only.
- Refresh this entry only after `themeMixer.js` actually changes audible playback behavior.

## Entry 2

### DeepWiki claim

- `src/renderer/lighting.js` configures ambient, directional, and point lights.

### Code evidence checked

- `src/renderer/lighting.js` creates one `AmbientLight` plus three `DirectionalLight` instances.
- The file comments explicitly say, "Instead of point lights ... use DirectionalLights for even coverage."

### Status

- contradicted

### Action needed

- Treat lighting documentation that mentions point lights as stale.
- Re-run extraction after lighting is refactored, not before.

## Entry 3

### DeepWiki claim

- There is no direct reference to `public/3d_sednaya`, and all current asset paths use `/assets/` as their base.

### Code evidence checked

- `src/renderer/loadingScene.js` loads `/3d_sednaya/building.js`, `/3d_sednaya/building-roof.js`, `/3d_sednaya/terrain.js`, `/3d_sednaya/panchromatic.jpg`, `/3d_sednaya/whiteBuilding.js`, `/3d_sednaya/corridor.js`, and `/3d_sednaya/groupcell-d.js`.
- `docs/agents/shared/02-runtime-flow.md` already documents the intro loading six legacy JSON assets under `/3d_sednaya/`.

### Status

- contradicted

### Action needed

- Keep intro assets documented as a separate runtime dependency.
- Do not let distilled summaries collapse the repo into `/assets/**` only.

## Entry 4

### DeepWiki claim

- `scripts/compress-glb.js` is the live GLB optimization pipeline that writes optimized files into `public/assets/models`.

### Code evidence checked

- `scripts/compress-glb.js` does write output to `public/assets/models/`.
- The script reads input from `public/assets/textures/`, which is currently the workflow-ambiguous directory noted in repo docs.
- The script deletes original input files after successful processing.

### Status

- partially confirmed

### Action needed

- Document the input-path ambiguity whenever referencing this script.
- Do not recommend running it blindly until the intended source directory is confirmed.

## Entry 5

### DeepWiki claim

- Subtitle text is incomplete and currently mocked rather than fully integrated.

### Code evidence checked

- `src/main.js` says, "Mocking text for now as it's not in JSON" and falls back to `Listening to Letter X...`.
- `src/data/letters.json` contains a `text` field for every record, but every current value is an empty string.

### Status

- confirmed

### Action needed

- Keep subtitle/text status documented as structurally present but content-empty.
- Refresh this entry if subtitle rendering or data population changes.

## Entry 6

### DeepWiki claim

- The build/deploy layer depends on `vite.config.js`, `public/_headers`, and `public/_redirects`.

### Code evidence checked

- `vite.config.js` defines Vite aliases, public-dir behavior, output directory, and GLB asset inclusion.
- `public/_headers` sets MIME type and CORS rules for GLB and MP3 assets.
- `public/_redirects` configures the SPA fallback to `/index.html`.

### Status

- confirmed

### Action needed

- Keep DeepWiki deployment summaries subordinate to these checked-in files.
- Re-run extraction after Pages or Vite config changes.

## Reusable template

### DeepWiki claim

- Replace with the exact DeepWiki claim being checked.

### Code evidence checked

- List the local files, docs, and observations used to validate the claim.

### Status

- confirmed
- partially confirmed
- contradicted
- unknown

### Action needed

- State the follow-up, doc correction, validation gap, or explicit no-action result.
