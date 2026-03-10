# DeepWiki Data Q&A

- Repository: `amrayach/house-of-letters`
- Extracted: `2026-03-09`
- Tool: `deepwiki.ask_question`

## Prompt

```text
Data-contract extraction for documentation cross-check. Describe the current data contracts and asset conventions in this repository, focusing on src/data/letters.json schema, field meanings, how model/userData/audio/image paths are used at runtime, asset folder conventions under public/assets and public/3d_sednaya, and any mismatches or assumptions that may affect edits.
```

## DeepWiki answer

### `letters.json` schema and field meanings

DeepWiki describes `src/data/letters.json` as a 46-record array with a stable schema:

- `id`: unique integer used as the runtime identifier
- `text`: currently empty, intended for associated text content
- `position`: `{ x, y, z }` scene coordinates
- `zone`: one of four zones
- `narration`: narration audio path
- `theme`: background theme path
- `frontImage`: front image path
- `backImage`: back image path
- `model`: GLB path

It also notes:

- `position.x` and `position.z` are multiplied by `MODEL.GRID_SCALE`
- `position.y` is fixed at `1.6`
- `theme` is present in the schema, but the same theme files are reused broadly

### Runtime usage of model, `userData`, audio, and image paths

DeepWiki says:

- `letters.js` loads the GLB at `data.model`
- loaded models copy the full letter record into `model.userData`
- `narration` and `theme` paths inform audio playback
- `frontImage` and `backImage` paths drive preview image updates in `main.js`
- `ProximityManager` uses `letter.userData.id` to trigger narration

### Asset folder conventions

DeepWiki identifies these asset folders:

- `public/assets/models`
- `public/assets/audio`
- `public/assets/letters`

It additionally claims there is no direct reference to `public/3d_sednaya` in the provided code or wiki context, and that all current asset paths use `/assets/` as their base.

### Mismatches or assumptions affecting edits

DeepWiki calls out:

- the `text` field exists but is currently unused
- changing `theme` paths may not produce distinct audible behavior without `themeMixer` changes
- `main.js` has fallback image naming assumptions
- there is no explicit schema validation for `letters.json`
- `MODEL.SCALE` and `MODEL.GRID_SCALE` globally affect the entire archive

It also mentions `.wav` alongside `.mp3` when discussing audio conventions.

## Capture note

This raw answer is intentionally not corrected. See `../distilled/mismatches-vs-code.md` for the intro-asset and theme-related corrections.
