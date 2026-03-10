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

- `index.html`: DOM shell for loading, start, pause, HUD, subtitles, preview, and module boot
- `src/main.js`: runtime orchestrator and animation loop entry point
- `src/styles/main.css`: overlay, HUD, and mobile-control styling loaded directly by `index.html`

## Rendering

- `src/renderer/sceneSetup.js`: creates the Three.js scene, camera, renderer, ground, and grid
- `src/renderer/lighting.js`: sets global lighting balance for front/back readability
- `src/renderer/controls.js`: desktop pointer-lock movement plus bird's-eye mode
- `src/renderer/letters.js`: GLB loading, retry logic, material handling, placement, and string attachment
- `src/renderer/loadingScene.js`: cinematic intro scene with postprocessing and Sednaya-related assets
- `src/renderer/particles.js`: optional lightweight dust particle helper
- `src/utils/loaders.js`: shared GLTF/texture/audio loader singletons and preload helper

## Audio

- `src/audio/audioEngine.js`: Howler-based background theme and narration playback with ducking and lazy loading
- `src/audio/themeMixer.js`: theme-switch placeholder; state tracking exists but real crossfading does not

## Interaction

- `src/interaction/proximityManager.js`: nearest-letter detection and activation/deactivation hooks
- `src/interaction/touchControls.js`: mobile joystick/look controls and touch UI elements

## Config/data

- `src/config/constants.js`: scene, camera, model, audio, interaction, animation, and asset path constants
- `src/data/letters.json`: runtime dataset for 46 letters with positions, zones, and asset references
- `src/data/letters_backup.json`: backup copy of letter metadata; useful for diffing, not runtime
- `src/chrono_timeline.txt`: planning note for chronology/zone distribution; reference only

## Deployment/build

- `package.json`: dependency list and `dev/build/preview/compress/clean` scripts
- `vite.config.js`: Vite plugin setup, aliases, build output, and GLB asset inclusion
- `public/_headers`: Cloudflare Pages headers for GLB and MP3 content types plus CORS
- `public/_redirects`: Cloudflare Pages SPA routing to `index.html`
- `README.md`: quick-start and deployment overview, but some implementation notes are stale
- `docs/0-index.md`: generated doc index; useful for browsing only after local code reads
- `docs/1-overview.md`: generated high-level summary; secondary to source files
- `docs/2-getting-started.md`: generated setup summary; secondary to `README.md` and `package.json`
- `docs/2.1-installation-and-setup.md`: generated install guide; secondary to local config

## Scripts

- `scripts/compress-glb.js`: GLB optimization script; verify path assumptions before use because it reads `public/assets/textures/*.glb`
- `scripts/generate-letter-positions.cjs`: regenerates 46 letter positions across 4 zones and writes `src/data/letters.json`; fallback defaults still use `.wav` names if metadata is missing

## Assets/noisy paths

- `public/assets/models/`: runtime GLB models; large and mostly data, read only when asset-level debugging matters
- `public/assets/audio/`: runtime MP3 narration/theme assets; read for counts and naming, not primary code understanding
- `public/assets/letters/`: front/back JPG scans; large content set, not primary code understanding
- `public/assets/textures/`: currently empty but referenced by the GLB compression script, so treat as workflow ambiguity
- `public/3d_sednaya/`: bulky loading-scene source assets/reference files; de-prioritize unless editing the cinematic intro
- `dist/`: generated build output; never start here for understanding current source
- `node_modules/`: dependency install tree; never start here for repo understanding
- `claude-skills/`: adjacent tooling workspace, not part of the application runtime
