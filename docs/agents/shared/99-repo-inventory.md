# 99. Repo Inventory

Use this as the compact path map for agent work. One line per path, local-first.

## Agent guidance

- `docs/agents/shared/11-tool-routing.md`: tool policy and local-first evidence rules
- `docs/agents/shared/09-validation-checklist.md`: default pre-edit and post-edit validation ladder
- `docs/agents/shared/13-skill-activation-matrix.md`: which skills are active, conditional, or parked for this repo
- `docs/agents/shared/00-project-overview.md`: compact repo snapshot, subsystem status, and known mismatches
- `docs/agents/shared/99-repo-inventory.md`: path-level inventory for quick orientation
- `docs/agents/prompts/repo-reading-order.md`: exact read order for fresh agent sessions
- `docs/agents/deepwiki/raw/`: place for raw DeepWiki captures if they are saved later; never primary truth
- `docs/agents/deepwiki/distilled/`: place for verified DeepWiki notes after comparison with local code
- `.claude/rules/`: short Claude-only subsystem deltas; keep them additive and non-canonical

## Entry points

- `index.html`: DOM shell for loading, start, pause, HUD, subtitles, preview, inspect UI, and module boot
- `src/main.js`: runtime orchestrator and animation loop entry point
- `src/styles/main.css`: overlay, HUD, inspect, and mobile-control styling loaded directly by `index.html`
- `public/listen/index.html`: standalone exhibition audio listener — self-contained HTML/CSS/JS for `/listen/?p={id}` routes, 11 papers with Arabic names and date spans

## Rendering

- `src/renderer/sceneSetup.js`: creates the Three.js scene, camera, renderer, ground, grid, and inspect-quality viewport toggles
- `src/renderer/lighting.js`: sets global lighting balance for front/back readability
- `src/renderer/controls.js`: desktop pointer-lock movement, bird's-eye mode, and inspect suppression seam
- `src/renderer/letters.js`: GLB loading, retry logic, material handling, placement, string attachment, and readable-side interaction metadata
- `src/renderer/orbitInspect.js`: isolated 3D orbit viewer for inspect mode — own scene, camera, renderer, OrbitControls, lazy-initialized
- `src/renderer/loadingScene.js`: cinematic intro scene with postprocessing and Sednaya-related assets
- `src/renderer/particles.js`: optional lightweight dust particle helper
- `src/utils/loaders.js`: shared GLTF/texture/audio loader singletons and preload helper

## Audio

- `src/audio/audioEngine.js`: Howler-based background theme and narration playback with ducking and lazy loading
- `src/audio/themeMixer.js`: theme-switch placeholder; state tracking exists but real crossfading does not

## Interaction

- `src/interaction/proximityManager.js`: readable-side candidate/active scoring plus activation/deactivation hooks
- `src/interaction/touchControls.js`: mobile joystick/look controls and touch UI elements

## Config/data

- `src/config/constants.js`: scene, camera, model, audio, interaction, inspect, renderer-quality, animation, and asset path constants
- `src/data/letters.json`: runtime dataset for 46 letters with positions, zones, and asset references
- `src/data/letters_backup.json`: backup copy of letter metadata; useful for diffing, not runtime
- `src/chrono_timeline.txt`: planning note for chronology/zone distribution; reference only

## Deployment/build

- `package.json`: dependency list and `dev/build/preview/compress/clean` scripts
- `vite.config.js`: Vite plugin setup, aliases, build output, and GLB asset inclusion
- `public/_headers`: Cloudflare Pages headers for content types, CORS, and cache-control across all asset types
- `public/_redirects`: Cloudflare Pages routing — `/*` SPA fallback to `index.html` (listener page uses directory-based routing via `public/listen/index.html`)
- `README.md`: quick-start, runtime controls, and deployment overview
- `docs/0-index.md`: generated doc index; useful for browsing only after local code reads
- `docs/1-overview.md`: generated high-level summary; secondary to source files
- `docs/2-getting-started.md`: generated setup summary; secondary to `README.md` and `package.json`
- `docs/2.1-installation-and-setup.md`: generated install guide; secondary to local config

## CI

- `.github/workflows/ci.yml`: validates content, builds, checks dist files, enforces `_redirects` ordering and domain correctness on push/PR to `main`

## Scripts

- `scripts/compress-glb.js`: GLB optimization script; verify path assumptions before use because it reads `public/assets/textures/*.glb`
- `scripts/generate-letter-positions.cjs`: regenerates 46 letter positions across 4 zones and writes `src/data/letters.json`; fallback defaults still use `.wav` names if metadata is missing
- `scripts/exhibition-papers.js`: canonical exhibition paper metadata (11 papers: listener ID → archive number, Arabic name, date span); synced inline in `listen/index.html`
- `scripts/generate-qr-codes.js`: generates exhibition QR codes for `/listen/?p=1` through `/listen/?p=11` with bilingual labels; output to `generated/qr-codes/`

## Favicon and social assets

- `public/favicon.svg`: SVG favicon — white monospace "H" on black
- `public/favicon.ico`: ICO fallback (32×32 + 16×16)
- `public/apple-touch-icon.png`: Apple touch icon (180×180)
- `public/icon-192.png`: PWA icon (192×192)
- `public/icon-512.png`: PWA icon (512×512)
- `public/og-image.png`: Open Graph / social sharing preview image (1200×630) — placeholder; replace with photographic image when available

## Assets/noisy paths

- `public/assets/models/`: runtime GLB models; large and mostly data, read only when asset-level debugging matters
- `public/assets/audio/`: runtime MP3 narration/theme assets; read for counts and naming, not primary code understanding
- `public/assets/letters/`: front/back JPG scans; large content set, not primary code understanding
- `public/assets/listen/`: exhibition audio MP3s for `/listen/?p={id}`; IDs 1-11, bilingual (`{id}_ar.mp3`, `{id}_en.mp3`); not referenced by `letters.json`
- `public/assets/textures/`: currently empty but referenced by the GLB compression script, so treat as workflow ambiguity
- `public/3d_sednaya/`: bulky loading-scene source assets/reference files; de-prioritize unless editing the cinematic intro
- `dist/`: generated build output; never start here for understanding current source
- `node_modules/`: dependency install tree; never start here for repo understanding
- `claude-skills/`: adjacent tooling workspace, not part of the application runtime
