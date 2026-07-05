# GLB Pipeline Rework — Plan (not started)

Status: **documented for later** (assessed 2026-07-06, after the paper-mirror runtime fix shipped).
Owner: Ammer. Prerequisite reading: `docs/agents/shared/03-data-assets.md` ("Runtime-derived GLB metadata" bullet on the source defect), `.claude/rules/renderer.md`.

## Why

The 47 production GLBs under `public/assets/models/` are one-off artifacts from an
interactive **Blender MCP session** — no command reproduces them, so every asset defect
has had to be patched at runtime (see `loadLetters()` in `src/renderer/letters.js`:
readable-skin index filter, texture U-flip, FrontSide). The generation script that was
developed alongside that session lives OUTSIDE this repo at
`/home/amay/Work/AlaaPrison/letter_to_glb.py` (Blender headless, with source scans in
`/home/amay/Work/AlaaPrison/input/` — 95 JPGs, same resolution as the embedded textures).

Reworking it buys, in order of value:

1. **Papers render twice as wide (2× legibility).** Production meshes have aspect 0.131
   vs the scans' true 0.261 — an MCP-session error that horizontally squeezes every paper
   2:1. The current script version computes aspect correctly. This is the single most
   visible improvement available and the main reason to do this. It is a client-visible
   change to a live memorial — get Alaa's sign-off with a before/after screenshot first.
2. **Reproducibility.** One command regenerates all models; future papers (105 physical
   papers exist, 46 modeled) become trivial to add.
3. **Clean assets.** Kill all source defects and dead weight listed below.
4. Optional ~30-40% download reduction (textures are ~99% of the ~23 MB; JPEG q85 or WebP).

## Defect → source map (all confirmed 2026-07-06)

| Shipped symptom | Birthplace in `letter_to_glb.py` |
| --- | --- |
| Horizontally mirrored UVs on every sheet | Line ~319: `uv.x = 1.0 - uv.x` ("Mirror horizontally for RTL text") — a misconception; scans of Arabic already read RTL as images. **Delete this block.** |
| Duplicate opposite-wound skin + ~53 degenerate rim triangles per sheet | Solidify modifier (0.2 mm) closes each plane into a slab. **Remove Solidify** (and the Bevel/EdgeSplit that only serve it); export simple single-sided planes. |
| Front/Back sheets crossing at mid-height (~9 µm apart) | MCP-session placement. Current script already separates planes (front y=+0.003, back y=−0.003) — keep a clear separation, just scaled to the target dims below. |
| 3 baked SUN lights per model (138 junk scene objects at runtime) | `setup_lighting()` + `export_lights=True`. **Set `export_lights=False`** and drop the function. |
| Dead PBR/bump/normal-map data (runtime uses MeshBasicMaterial) | Node graph in `create_material_from_image`. **Reduce to plain image → Base Color.** |
| — (latent) | Export enables **Draco** (`export_draco_mesh_compression_enable=True`); the site loader has Draco DISABLED (`getGLTFLoader()` in `src/utils/loaders.js`). The existing regenerated batch at `/home/amay/Work/AlaaPrison/input/output/*.glb` (47 files, Blender 4.5 exporter) is **unloadable by the site** for this reason. **Disable Draco** — geometry is 2 quads + a box; bytes are all texture. |
| — (latent) | `scripts/compress-glb.js` uastc/KTX2 step produces textures the runtime cannot decode (no KTX2Loader configured). Reconcile: either drop the step or add KTX2Loader. |

## Hazards (read before starting)

1. **Deploy coupling with the runtime patch.** `letters.js` currently applies an
   unconditional texture U-flip; feeding it *corrected* models would re-mirror them.
   **Step 1 of execution is making the runtime correction self-detecting** (per sheet:
   compare UV du/dx sign against triangle winding, flip only when mirrored; the skin
   filter already self-guards via its `kept.length < index.count` check). After that,
   assets and code can deploy independently.
2. **Dimension compatibility.** Do NOT export at the script's current "real" size
   (0.39 m planes). Match the production GLB envelope so `MODEL.SCALE=8`, spawn,
   proximity thresholds, and inspect framing stay valid: plexi 0.1 × 0.2 × 0.001,
   plane height 0.078, plane width = height × true scan aspect (≈ 0.0204 for letter 1).
   Only the width/proportion changes.
3. **Blender version drift.** Installed Blender is 5.0.1; the script targets 3.x/4.x
   (the `if 'X' in principled.inputs` guards help, but exporter kwargs change between
   versions — verify `export_image_format`, jpeg quality, draco flags exist under 5.x).
4. STATUS.md in AlaaPrison claims "WORKING PERFECTLY" — do not trust it; it predates the
   defect discoveries (the RTL mirror line is deliberate in that "working" version).

## Execution plan

1. Runtime: make the mirror correction in `src/renderer/letters.js` self-detecting
   (UV-direction × winding test per sheet). Ship independently; verify against CURRENT
   production models with the harness (expectations unchanged).
2. Script: apply the fix column of the table above; target the dimensions in Hazard 2;
   JPEG quality 90 (or WebP after a load test); keep node names `Front`/`Back`/`PlexiFrame`
   and material names `Material_Front`/`Material_Back`/`PlexigGlassMaterial` — the runtime
   detects glass by name (`glass`/`plexi` substring).
3. Regenerate all 47 from `/home/amay/Work/AlaaPrison/input/` (input naming `{id}.jpg` /
   `{id}-{id}.jpg` already matches the site's IDs; output `{id}.glb` is drop-in).
4. Acceptance gates, in order:
   - `node dev/inspect-glb.mjs` over all 47: single-skin meshes (no opposite-wound
     population), uniform unmirrored du/dx per view side, no sheet crossover, no light
     nodes, aspect ≈ scan aspect.
   - `dev/paper-orientation-check.html` `window.__check()` sweep: `asIs` ≥ ~0.7 and
     `mirrored`/cross-page ≤ ~0.25 for every letter, both sides (letters 2 and 38 are
     wider-format; expect lower but still dominant asIs).
   - In-app: walk-up + inspect orbit on letters 1, 16, 33; both sides readable; strings,
     glass, proximity, floor dates intact; `npm run build` green.
5. Show Alaa the proportion before/after; on sign-off, replace `public/assets/models/*.glb`,
   commit assets + any runtime cleanup together, deploy, verify live bundle + spot-check.

Estimated effort: ~half a day including verification. Most of it is steps 4–5.
