# DeepWiki Build and Deploy Q&A

- Repository: `amrayach/house-of-letters`
- Extracted: `2026-03-09`
- Tool: `deepwiki.ask_question`

## Prompt

```text
Build and deploy extraction for documentation cross-check. Describe the current build/deploy assumptions in this repository, including package.json scripts, vite.config.js behavior, public asset handling, Cloudflare Pages files, routing/header assumptions, and any deployment-sensitive constraints or caveats.
```

## DeepWiki answer

### Build process

DeepWiki describes the Vite build flow and these `package.json` scripts:

- `dev`
- `build`
- `preview`
- `compress`
- `clean`

It says `build` compiles the project for production and is the Pages deployment command.

### `vite.config.js`

DeepWiki captured these Vite behaviors:

- `vite-plugin-glsl`
- `publicDir: 'public'`
- path aliases for `@audio`, `@data`, and the other `src` folders
- `outDir: 'dist'`
- manual chunking for `three`
- explicit `.glb` asset inclusion

### Public assets and Cloudflare Pages

DeepWiki says:

- assets live under `public/assets`
- `public/_redirects` handles SPA fallback
- `public/_headers` sets MIME types and CORS headers for GLB and MP3 responses
- Pages deployment is static and depends on `dist/`

### Deployment-sensitive constraints and caveats

DeepWiki calls out:

- `compress` as a manual optimization step
- modern-browser assumptions
- a 10-minute loading timeout and retry logic for slow networks

It also describes `scripts/compress-glb.js` as a KTX2-based optimization pipeline that writes optimized files into `public/assets/models`.

## Capture note

This raw answer is intentionally not corrected. See `../distilled/confirmed-vs-unconfirmed.md` and `../distilled/mismatches-vs-code.md` for code-checked status.
