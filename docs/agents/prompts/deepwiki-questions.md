# DeepWiki Questions

Use these fixed prompts when refreshing the DeepWiki layer for this repository.

Operating rules:

- Read local code and shared docs first.
- Save DeepWiki output under `docs/agents/deepwiki/raw/`.
- Distill only after checking claims against local code and repo docs.
- If DeepWiki is unavailable, keep the raw file headings and paste-in instructions; do not invent answers.

## Fixed prompts

### 1. Repository architecture

```text
Repository architecture extraction for documentation cross-check. Describe the top-level architecture, major subsystems, ownership boundaries, and how the main entrypoints fit together. Keep claims specific to this repository.
```

### 2. Runtime lifecycle

```text
Runtime lifecycle extraction for documentation cross-check. Describe the runtime sequence from index.html boot through main.js initialization, loading scene behavior, asset loading, start/pause handoff, control activation, animation loop, proximity/audio behavior, and cleanup. Call out sequencing gates and state coupling.
```

### 3. File and folder responsibilities

```text
File and folder responsibility extraction for documentation cross-check. Describe the responsibilities and boundaries of index.html, src/main.js, src/renderer, src/audio, src/interaction, src/utils, src/config, src/data, public, scripts, and docs. Note where ownership is clear versus inferred.
```

### 4. Data contracts

```text
Data-contract extraction for documentation cross-check. Describe the current data contracts and asset conventions in this repository, focusing on src/data/letters.json schema, field meanings, how model/userData/audio/image paths are used at runtime, asset folder conventions under public/assets and public/3d_sednaya, and any mismatches or assumptions that may affect edits.
```

### 5. Build and deploy assumptions

```text
Build and deploy extraction for documentation cross-check. Describe the current build/deploy assumptions in this repository, including package.json scripts, vite.config.js behavior, public asset handling, Cloudflare Pages files, routing/header assumptions, and any deployment-sensitive constraints or caveats.
```

### 6. Incomplete or placeholder areas

```text
Incomplete-area extraction for documentation cross-check. Identify incomplete, provisional, or placeholder areas in the repository. Separate what is clearly implemented from what appears stubbed, mocked, or only partially wired.
```

### 7. Performance-sensitive areas

```text
Performance-sensitive-area extraction for documentation cross-check. Identify current hot paths, heavy initialization work, asset or GPU pressure points, per-frame costs, and code paths where seemingly small changes could have disproportionate performance impact.
```

### 8. Risky refactor zones

```text
Risky-refactor extraction for documentation cross-check. Identify files, boundaries, or state couplings where refactors are especially risky. Explain why each area is brittle and what should be re-validated after changes.
```

## Saved extraction grouping

Use the fixed prompts above, but save captures into these stable raw files:

- `wiki-structure.md`
  - use `deepwiki.read_wiki_structure`
- `architecture-qa.md`
  - combine prompts 1, 3, 6, 7, and 8
- `runtime-qa.md`
  - use prompt 2
- `data-qa.md`
  - use prompt 4
- `deploy-qa.md`
  - use prompt 5

## Current extraction run

The 2026-03-09 run used this stable mapping:

- `architecture-qa.md`

```text
Repository architecture extraction for documentation cross-check. Answer in markdown with short sections for: 1) top-level architecture and major subsystems, 2) file and folder responsibilities across src/main.js, src/renderer, src/audio, src/interaction, src/utils, public, scripts, and docs, 3) incomplete or placeholder areas, 4) performance-sensitive areas, 5) risky refactor zones and why they are risky. Keep claims specific to this repository.
```

- `runtime-qa.md`

```text
Runtime lifecycle extraction for documentation cross-check. Describe the runtime sequence from index.html boot through main.js initialization, loading scene behavior, asset loading, start/pause handoff, control activation, animation loop, proximity/audio behavior, and cleanup. Call out sequencing gates and state coupling.
```

- `data-qa.md`

```text
Data-contract extraction for documentation cross-check. Describe the current data contracts and asset conventions in this repository, focusing on src/data/letters.json schema, field meanings, how model/userData/audio/image paths are used at runtime, asset folder conventions under public/assets and public/3d_sednaya, and any mismatches or assumptions that may affect edits.
```

- `deploy-qa.md`

```text
Build and deploy extraction for documentation cross-check. Describe the current build/deploy assumptions in this repository, including package.json scripts, vite.config.js behavior, public asset handling, Cloudflare Pages files, routing/header assumptions, and any deployment-sensitive constraints or caveats.
```
