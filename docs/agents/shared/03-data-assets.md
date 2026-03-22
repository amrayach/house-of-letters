# 03. Data & Assets

## Source of truth

- Runtime metadata: `src/data/letters.json`
- Provisional grouped chronology metadata: `src/data/provisionalChronology.js`
- Static assets served as-is: `public/assets/**`
- Generated output only: `dist/**`
- Backup copy: `src/data/letters_backup.json`
- Validation entrypoint: `npm run validate:letters`
- Optional CI gate: `npm run validate:letters -- --strict`

## `letters.json` schema

Observed runtime schema: 46 records, all with the same keys today.

```json
{
  "id": 1,
  "text": "",
  "position": { "x": 0, "y": 1.6, "z": -37.5 },
  "zone": 1,
  "narration": "/assets/audio/narration_1.mp3",
  "theme": "/assets/audio/theme_1.mp3",
  "frontImage": "/assets/letters/1.jpg",
  "backImage": "/assets/letters/1-1.jpg",
  "model": "/assets/models/1.glb"
}
```

| Field | Required? | Type | Current meaning |
| --- | --- | --- | --- |
| `id` | yes | number | positive integer primary runtime identifier; copied into `model.userData.id` |
| `text` | no | string | subtitle/content field; empty string is allowed but the UI falls back today |
| `position` | yes | object | archive placement in world-space grid units before `MODEL.GRID_SCALE` is applied to `x/z` in `letters.js` |
| `zone` | yes | number | chronological/content bucket; validator currently accepts `1..4` |
| `narration` | no | string | MP3 path used by `audioEngine.registerNarration()` when present |
| `theme` | no | string | theme track metadata; path is validated when present, but runtime switching is still placeholder-only |
| `frontImage` | no | string | preview image shown in HUD; if omitted, runtime falls back to `/assets/letters/{id}.jpg` |
| `backImage` | no | string | back scan shown in HUD; if omitted, runtime falls back to `/assets/letters/{id}-{id}.jpg` |
| `model` | yes | string | GLB path loaded by `loadLetters()` |

## Validation contract

`npm run validate:letters` enforces the current repo-native content contract without mutating data.

### Hard failures

- `letters.json` must parse to a top-level array
- every record must be an object
- required fields must exist: `id`, `position`, `zone`, `model`
- `id` must be a unique positive integer
- `position.x`, `position.y`, and `position.z` must be finite numbers
- `zone` must be one of `1`, `2`, `3`, or `4`
- `model` must be a root-absolute path under `/assets/models/` and the target file must exist
- optional asset fields become errors when present but invalid:
  - `frontImage` / `backImage` must point under `/assets/letters/`
  - `narration` must point under `/assets/audio/`
- omitted `frontImage` / `backImage` become errors when the conventional fallback file also does not exist

### Warnings

- missing `text`
- empty `text` values, because subtitle UI falls back to placeholder copy
- missing `narration`, because that letter will be silent
- missing `theme`, because the metadata contract is incomplete even though runtime ignores per-letter themes today
- invalid or missing theme files when `theme` is present
- unknown extra keys on records
- non-conventional `model` paths that do not match `/assets/models/{id}.glb`
- orphaned assets under `public/assets/models/`, `public/assets/letters/`, or `public/assets/audio/` that are not referenced by `letters.json`

### Notes on what the validator intentionally does not enforce

- It does not require subtitle text to be populated.
- It does not enforce per-zone `z` ranges from `scripts/generate-letter-positions.cjs`.
  - The checked-in runtime data already extends beyond those older generator bounds.
  - Validate zone membership via `zone`, not via inferred placement ranges.
- By default it exits non-zero only on hard failures.
  - Use `npm run validate:letters -- --strict` when warnings should fail in CI.

## Observed dataset shape

- Record count: 46
- Zone counts: `1 / 5 / 12 / 28`
- Zone z-ranges in current runtime file (temporal distribution, ~203 units total):
  - zone 1: `-42.00`
  - zone 2: `-13.85 .. 31.05`
  - zone 3: `39.80 .. 89.66`
  - zone 4: `91.68 .. 160.74`
- Z-positions are temporally distributed: physical distance reflects time between diary entries. Source data: `src/data/diary_index_001_048.csv`. Parameters: scale=0.7, power=0.6, minZGap=0.5.
- All current asset references in `letters.json` resolve to existing files under `public/`.

## Provisional grouped chronology mapping

- `src/data/provisionalChronology.js` is the temporary chronology authority for the ground timeline.
- It does not add per-letter archival dates to `letters.json`.
- It currently defines four grouped chronology records with:
  - `zone`
  - `ambientLabel`
  - `focusedLabel`
  - `letterIds`
- The module validates at import time that:
  - all 46 runtime letters are covered exactly once
  - every covered letter's `zone` matches `letters.json`
- If validation fails, it logs once and exports a falsey validated chronology so timeline setup can disable safely.
- Current grouped labels are:
  - zone 1: `1988-1990` / `11/10/1988 - 01/01/1990`
  - zone 2: `1990-1991` / `01/01/1990 - 05/01/1991`
  - zone 3: `1991-1992` / `12/02/1991 - 01/01/1992`
  - zone 4: `1992` / `01/01/1992 - 21/07/1992`

## Asset path conventions

| Asset kind | Current convention | Notes |
| --- | --- | --- |
| GLB model | `/assets/models/{id}.glb` | 46 records reference IDs `1..46`; `public/assets/models/47.glb` exists but is unused by runtime |
| Front image | `/assets/letters/{id}.jpg` | preview UI uses this directly when present and falls back to this pattern when omitted; `public/assets/letters/47.jpg` is currently unused |
| Back image | `/assets/letters/{id}-{id}.jpg` | preview UI assumes this naming when fallbacking; `public/assets/letters/47-47.jpg` is currently unused |
| Narration | `/assets/audio/narration_{n}.mp3` | only 15 narration files exist; records reuse them |
| Theme | `/assets/audio/theme_1.mp3` or `/assets/audio/theme_2.mp3` | data exists, runtime switching does not |
| Intro assets | `/3d_sednaya/*.js`, `/3d_sednaya/panchromatic.jpg` | used only by `LoadingScene`; `_headers` adds 7-day cache |
| Exhibition listen audio | `/assets/listen/{id}_ar.mp3`, `/assets/listen/{id}_en.mp3` | standalone listener page; IDs 1-11; listener IDs map to archive paper numbers via `scripts/exhibition-papers.js`; not referenced by `letters.json` or the 3D archive runtime |

## Model/audio/image relationships

- One record maps one letter ID to:
  - 1 GLB model
  - 2 preview JPGs
  - 1 narration path
  - 1 theme path
- Audio is many-to-one today:
  - 46 records reuse 15 narration files
  - 30 records point to `theme_1.mp3`
  - 16 records point to `theme_2.mp3`
- Runtime coupling:
  - preview images read directly from `letters.json`
  - narration is triggered from `model.userData.id`
  - theme data is present but currently informational only
  - grouped ground chronology reads from `provisionalChronology.js` and loaded letter-object positions; it does not write back into `letters.json`

## Runtime-derived GLB metadata

- `letters.json` does not store readable-side targeting or inspect-camera data directly.
- During `loadLetters(scene, lettersData, renderer, onProgress)`, each loaded GLB derives runtime-only metadata under `model.userData.interaction`, including:
  - expanded trigger bounds
  - front/back readable-side bounds, centers, and normals
  - invisible front/back focus helpers used for candidate scoring
  - provisional inspect anchors used for inspect camera framing
- Readable-side direction comes from the GLB `Front` and `Back` node transforms first; mesh-normal synthesis is only a fallback when those nodes are missing or malformed.
- The renderer argument is used only to cap letter-scan texture anisotropy at runtime; this is not part of the JSON content contract.

## Generated vs source assets

### Source / editable

- `src/data/letters.json`
- `public/assets/models/*`
- `public/assets/audio/*`
- `public/assets/letters/*`
- `public/assets/listen/*` (exhibition audio — standalone, not referenced by `letters.json`)
- `public/3d_sednaya/*`

### Generated / do not edit directly

- `dist/assets/**`
- `dist/_headers`
- `dist/_redirects`
- `dist/index.html`

### Script-owned or semi-generated

- `scripts/generate-letter-positions.cjs`
  - **Temporal Layout v4**: z-positions are derived from diary entry dates in `src/data/diary_index_001_048.csv`
  - uses power-law gap transform: `zGap = MIN_Z_GAP + SCALE × dayGap^POWER` (defaults: 2.0, 0.4, 0.5)
  - x-positions use the meander algorithm (S-curve river shape with zone 3 mirror)
  - zone z-boundaries are derived from paper positions, not prescribed
  - preserves existing metadata when present (narration, theme, images, model paths, text)
  - papers 47-48 in CSV are skipped (not in the 46-letter archive)
  - year typos outside 1988-1992 are auto-corrected and logged
  - `dev/meander-tool.html` is currently out of sync — it still uses even z-distribution
- `scripts/validate-letters.js`
  - validates `src/data/letters.json` plus referenced `public/assets/**` files
  - exits non-zero only on hard failures by default
  - `--strict` promotes warnings to a failing exit code for CI or release gates
  - is safe to run in CI or local development because it never rewrites data
- `scripts/compress-glb.js`
  - expects source GLBs in `public/assets/textures/`
  - writes optimized files into `public/assets/models/`
  - current input directory is empty, so verify the workflow before running it
  - use `gltf-transform inspect` and `gltf-transform validate` on representative GLBs before any asset rewrite; current runtime evidence does not justify routine recompression of the embedded archival JPEG scans

## Safe vs unsafe mass edits

### Usually safe

- Editing `text` values only
- Replacing files in place while preserving existing filenames and extensions
- Updating `frontImage` / `backImage` / `narration` / `model` paths if the target files already exist

### Unsafe without wider review

- Renumbering `id` values
- Renaming/moving `public/assets/**` directories
- Bulk-changing `theme` values expecting audible behavior today
- Editing `dist/**`
- Re-running `scripts/generate-letter-positions.cjs` without first reviewing its current zone-bound and fallback-extension assumptions
- Running `scripts/compress-glb.js` without first fixing its input-path assumptions
- Large manual edits to the current one-line `letters.json` without reformatting or validating existence paths

## Data quality issues observed

- All 46 `text` fields are empty, so subtitles fall back to `Listening to Letter X...`.
- Runtime data uses 46 letters, but `public/assets/models/` contains 47 numbered GLBs.
- `public/assets/letters/47.jpg` and `public/assets/letters/47-47.jpg` are also unreferenced by runtime data.
- Narration files are heavily reused; this may be intentional, but it is not obvious from the data alone.
- `src/data/letters_backup.json` is close to runtime truth but diverges in later z-values; do not treat it as authoritative.
- `letters.json` is currently minified to a single line, which makes review and merge conflict resolution harder.
- `scripts/generate-letter-positions.cjs` no longer encodes the full zone spread present in the checked-in runtime data.
