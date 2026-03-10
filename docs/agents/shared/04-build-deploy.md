# 04. Build & Deploy

## NPM scripts

| Script | Command | Current use | Constraints |
| --- | --- | --- | --- |
| `npm run dev` | `vite` | local development server | Vite dev server auto-opens a browser (`server.open: true`) |
| `npm run validate:letters` | `node scripts/validate-letters.js` | validate `letters.json` plus checked-in asset references | non-destructive; exits non-zero only on hard data/path failures by default |
| `npm run build` | `vite build` | production static build | emits `dist/`; required for Pages deploys |
| `npm run preview` | `vite preview` | local preview of built output | validates production pathing, not dev-only behavior |
| `npm run compress` | `node scripts/compress-glb.js` | intended GLB optimization pass | verify script input path before use |
| `npm run clean` | `rm -rf dist node_modules/.vite` | clears build output and Vite cache | destructive to generated output only |

## Vite behavior in this repo

### Relevant config

- `publicDir: 'public'`
- aliases:
  - `@` -> `src`
  - `@audio`, `@renderer`, `@data`, `@config`, `@utils`, `@interaction`
- `assetsInclude: ['**/*.glb']`
- build output: `dist`
- manual chunking: `three` is split into a separate chunk

## What that means here

- Files under `public/` are served at `/` during dev and copied as-is to the build output root during build.
- Root-absolute URLs such as `/assets/models/1.glb` or `/3d_sednaya/building.js` therefore refer to files under `public/`, not `src/`.
- `resolve.alias` only affects source imports like `@renderer/letters.js`; it does not rewrite string URLs inside `letters.json`.
- `assetsInclude` matters for imported asset files with unusual extensions. In this repo, most GLBs are loaded by root-absolute string paths from JSON, so `assetsInclude` is secondary rather than primary.

## Content validation and CI fit

- `npm run validate:letters` reads `src/data/letters.json` and the checked-in `public/assets/**` tree.
- It is safe for local development and CI because it only reports; it does not rewrite data or assets.
- `npm run validate:letters -- --strict` uses the same validator but fails the job on warnings as well.
- Use it after content/path edits and before trusting a successful build as proof that the archive dataset is sound.
- A passing build does not replace content validation; missing public assets can still produce runtime failures even when Vite compiles successfully.
- The validator also reports orphaned assets under `public/assets/models/`, `public/assets/letters/`, and `public/assets/audio/`.

## Cloudflare Pages assumptions

- Deployment target is a static Cloudflare Pages site.
- Expected build command: `npm run build`
- Expected output directory: `dist`
- `_headers` and `_redirects` are authored in `public/` so Vite copies them into `dist/`.

## `_redirects`

Current file:

```text
/*  /index.html  200
```

Implication:

- SPA-style fallback routes resolve to `index.html`.
- This works for the current static Pages shape.
- If Pages Functions or another SSR/runtime layer is added later, `_redirects` stops being the full routing story.

## `_headers`

Current rules set `Content-Type` and `Access-Control-Allow-Origin: *` for:

- `/*.glb`
- `/assets/models/*.glb`
- `/*.mp3`
- `/assets/audio/*.mp3`

Implications:

- Rules are parsed by Pages; `_headers` itself is not served as a public file.
- They apply to static asset responses.
- If the project later adds Pages Functions, these rules will not cover Function-generated responses.

## Deployment-sensitive constraints

- All runtime asset references are root-absolute (`/assets/...`, `/3d_sednaya/...`).
  - This assumes deployment at the domain root.
  - There is no current `base` handling via `import.meta.env.BASE_URL`.
- Do not rename `public/_headers` or `public/_redirects`.
- Do not move `public/assets/**` unless `letters.json`, constants, and intro paths are updated together.
- Do not assume the build system fingerprints or rewrites these public assets; Pages serves them as copied files.
- If CORS/header policy changes, validate GLB and MP3 fetches in the deployed environment, not just locally.

For deploy-related skill routing, see `docs/agents/shared/13-skill-activation-matrix.md`. For browser validation after deploy-sensitive edits, use `docs/agents/shared/09-validation-checklist.md`.

## Validation after deploy-affecting edits

Use `docs/agents/shared/09-validation-checklist.md` as the default ladder, then apply these deploy-specific checks:

1. Confirm `vite.config.js`, `public/_headers`, and `public/_redirects` still match the runtime asset paths.
2. Run `npm run validate:letters` when `src/data/letters.json` or `public/assets/**` changed.
   - Use `npm run validate:letters -- --strict` when warnings should block release or CI.
3. Build locally with `npm run build` when code/config changes justify it.
4. Verify `dist/_headers` and `dist/_redirects` exist after build.
5. Smoke-test GLB, MP3, and SPA fallback behavior in a browser or deployed preview.
