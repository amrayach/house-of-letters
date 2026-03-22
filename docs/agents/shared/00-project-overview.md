# 00. Project Overview

## Snapshot

- Project type: client-side interactive 3D archive/gallery
- Runtime stack: `Vite + Three.js + Howler + postprocessing`
- Deployment target: `Cloudflare Pages`
- Production domain: `https://www.houseofdreams.space/`
- Runtime identity mismatch: package and repo say `house-of-letters`; UI title says `House of Dreams`

## What this project is

This app loads scanned letters as 3D GLB objects, places them in a navigable space, uses readable-side targeting to decide which letter is in focus, plays narration when the user approaches a readable letter face, and wraps the experience in a cinematic loading intro plus overlay UI.

A companion standalone page at `/listen/?p={id}` (`public/listen/index.html`) serves as an exhibition audio guide: visitors at the physical installation scan QR codes next to diary papers and hear Arabic or English narration on their phones. This page is fully self-contained — no Three.js, no Vite processing, no runtime dependencies on the 3D archive. It displays each paper's Arabic archival name, diary entry date span, and archive paper number.

## Runtime entry points

- `index.html`: declares the overlay DOM, loads `/src/styles/main.css`, and boots `/src/main.js`
- `src/main.js`: orchestration entry point; initializes scene, loading flow, controls, audio, proximity, UI updates, and the animation loop
- `src/styles/main.css`: styles the loading screen, start/pause screens, HUD, inspect UI, mobile controls, and preview UI
- `public/listen/index.html`: standalone exhibition audio listener — self-contained HTML/CSS/JS, no Vite processing, served via directory-based routing

## Major subsystems

| Area | Primary paths | Current state |
| --- | --- | --- |
| Rendering | `src/renderer/*` | active and central; scene, lighting, controls, GLB loading, cinematic intro, minor particle support |
| Audio | `src/audio/*` | partly complete; `audioEngine.js` is working Howler playback, `themeMixer.js` is still a placeholder |
| Interaction | `src/interaction/*` | active; readable-side targeting, inspect entry support, and mobile touch controls are implemented |
| Config and content | `src/config/constants.js`, `src/data/letters.json` | active; constants and 46-letter runtime dataset drive behavior |
| Shared loaders | `src/utils/loaders.js` | active; shared GLTF/texture/audio loaders plus preload helper |
| Deployment/build | `package.json`, `vite.config.js`, `public/_headers`, `public/_redirects` | active; Vite build and Cloudflare Pages routing are in place |
| Maintenance scripts | `scripts/*` | mixed; letter validator is grounded, while the position generator and GLB compression workflow both need assumption checks before routine use |

## Appears complete

- Vite boot path from `index.html` to `src/main.js`
- Scene setup, lighting, animation loop, and letter loading
- Desktop pointer-lock controls and mobile touch controls
- Loading intro flow and overlay UI shell
- Readable-side targeting plus full-size inspect overlay
- Howler-based theme playback and narration lazy loading
- Cloudflare Pages deployment files for SPA routing and asset headers
- Exhibition audio listener page (`/listen/?p={id}`) — 11 papers with Arabic names and date spans; awaiting client MP3 files for papers 4–11

## Appears incomplete

- Theme transitions: `src/audio/themeMixer.js` only records/logs state and does not crossfade audio
- Subtitles/text content: `letters.json` text fields are empty, so `src/main.js` falls back to `Listening to Letter X...`
- Spatial audio: current audio is not true positional audio
- Asset pipeline workflow: `scripts/compress-glb.js` expects `.glb` inputs in `public/assets/textures/`, but that directory is currently empty
- Position-generation workflow: `scripts/generate-letter-positions.cjs` still uses older zone bounds and `.wav` fallback defaults, so regenerated output needs review before merging

## Appears placeholder or provisional

- `src/data/letters_backup.json` as a backup/noisy data artifact rather than runtime truth
- `src/chrono_timeline.txt` as planning/reference text rather than runtime code

## What an agent should read first before editing code

1. `docs/agents/shared/11-tool-routing.md`
2. `docs/agents/shared/13-skill-activation-matrix.md`
3. `README.md`
4. `package.json`
5. `vite.config.js`
6. `index.html`
7. `src/main.js`
8. `src/config/constants.js`
9. `src/data/letters.json`
10. The touched subsystem under `src/renderer`, `src/audio`, `src/interaction`, or `src/utils`
11. Relevant script under `scripts/` if the task touches assets or data generation

## MCP/skill routing pointers

- Use `docs/agents/shared/11-tool-routing.md` for MCP order and evidence priority.
- Use `docs/agents/shared/13-skill-activation-matrix.md` for which skills are active, conditional, or parked.
- Use `docs/agents/shared/09-validation-checklist.md` for post-edit validation and peer-review triggers.

## Known ambiguities or mismatches

- Naming mismatch: user-facing title is `House of Dreams`, but package/repo naming is `house-of-letters`
- README now reflects the current runtime shape, but the package/UI naming mismatch remains
- Runtime data has 46 letters (`src/data/letters.json`), while `public/assets/models/` and `public/assets/letters/` currently contain 47 numbered asset sets
- `scripts/generate-letter-positions.cjs` still targets 46 letters across 4 zones, but its encoded bounds and fallback extensions now lag the checked-in runtime data
- `scripts/generate-letter-positions.cjs` preserves current MP3 metadata when existing data is present, but its fallback defaults still point to `.wav` files
- `scripts/compress-glb.js` currently points at `public/assets/textures/*.glb`, but that directory is empty in the checked-out repo

## DeepWiki check

- Confirmed: broad subsystem split, Vite/Three.js/Howler stack, and Cloudflare Pages deployment shape
- Contradicted or lagged: it described outdated placeholder audio/data details and missed `scripts/generate-letter-positions.cjs`
- Policy result: DeepWiki is useful for repo-level summaries, but local code remains the source of truth
