# House of Dreams

Interactive 3D letter archive built with `Vite`, `Three.js`, and `Howler`. The in-app title is `House of Dreams`; the repo/package name remains `house-of-letters`.

## Current Runtime

- Boots from `index.html` into `src/main.js`
- Plays a cinematic loading intro before handing off to the archive scene
- Loads 46 GLB letter models from `src/data/letters.json`
- Supports desktop pointer-lock controls and mobile touch controls
- Uses readable-side candidate targeting instead of raw nearest-letter activation
- Shows front/back letter scans plus subtitle fallback UI for the active letter
- Exposes a dedicated inspect mode for full-size front/back scan viewing
- Plays a looping background theme and lazy-loads narration with ducking
- Deploys as a static site to Cloudflare Pages

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Vite usually opens the local URL automatically. If it does not, open the URL it prints, usually `http://localhost:5173`.

## Commands

- `npm run dev`: start the Vite dev server
- `npm run validate:letters`: validate `src/data/letters.json` plus referenced assets under `public/assets/**`
- `npm run validate:letters -- --strict`: run the same validator, but fail on warnings for CI or release gates
- `npm run build`: create the production build in `dist/`
- `npm run preview`: preview the built output locally
- `npm run compress`: run the GLB compression helper; verify its input-path assumptions before using it

## Controls

Desktop:
- Click `Enter Archive` to start and capture the pointer
- `W / A / S / D` to move
- Mouse to look around
- `E` to enter or exit inspect mode when a letter candidate is available
- `F` / `B` to switch inspect sides, `+` / `-` to zoom, `0` to reset zoom
- `B` to toggle bird's-eye while the archive is active
- `ESC` to release pointer lock and pause

Mobile:
- Tap `Enter Archive` to start
- Use the on-screen joystick and look area to move
- Use the `Inspect` button when it appears to open the focused letter scan
- Use the pause button to return to the shell

## Content Pipeline

- Runtime source of truth: `src/data/letters.json`
- Runtime assets: `public/assets/models`, `public/assets/letters`, `public/assets/audio`
- Data paths are root-absolute public URLs such as `/assets/models/1.glb`
- `npm run validate:letters` is non-destructive and reports:
  - malformed records or duplicate IDs
  - invalid/missing required model paths
  - invalid zone values
  - missing image/audio/model files
  - optional-field gaps that fall back at runtime
  - orphaned image/audio/model assets not referenced by `letters.json`

## Deployment

Cloudflare Pages expects:

- build command: `npm run build`
- output directory: `dist`
- SPA fallback from `public/_redirects`
- static asset header rules from `public/_headers`

Files under `public/` are served at the site root in dev and copied into `dist/` on build, so asset strings like `/assets/models/1.glb` must continue to match the `public/` tree.

## Current Known Gaps

- `src/audio/themeMixer.js` is still placeholder-only, so per-letter `theme` metadata is informational rather than audible behavior
- All `letters.json.text` values are empty, so subtitle UI falls back to `Listening to Letter X...`
- `public/assets/models/47.glb` plus `public/assets/letters/47.jpg` and `47-47.jpg` exist but are not currently referenced by runtime data
- `scripts/compress-glb.js` still needs its source-path assumptions verified before it should be part of a routine asset workflow
