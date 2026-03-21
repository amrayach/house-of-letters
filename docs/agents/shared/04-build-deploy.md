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
- Production domain: `https://www.houseofdreams.space/`
- Expected build command: `npm run build`
- Expected output directory: `dist`
- `_headers` and `_redirects` are authored in `public/` so Vite copies them into `dist/`.

## `_redirects`

Current file:

```text
/listen/*  /listen.html  200
/*  /index.html  200
```

Implication:

- `/listen/*` routes resolve to `listen.html`, the standalone exhibition audio listener page. This rule must stay before the SPA catch-all because Cloudflare Pages processes `_redirects` top-to-bottom, first match wins.
- All other routes fall through to `index.html` for the main SPA.
- If Pages Functions or another SSR/runtime layer is added later, `_redirects` stops being the full routing story.

## `_headers`

Current rules cover 14 path patterns with `Content-Type`, `Access-Control-Allow-Origin`, and `Cache-Control` headers:

| Path pattern | Content-Type | CORS | Cache-Control |
| --- | --- | --- | --- |
| `/assets/*.js` | — | — | `public, max-age=31536000, immutable` |
| `/assets/*.css` | — | — | `public, max-age=31536000, immutable` |
| `/*.glb` | `model/gltf-binary` | `*` | `public, max-age=604800, must-revalidate` |
| `/assets/models/*.glb` | `model/gltf-binary` | `*` | `public, max-age=604800, must-revalidate` |
| `/*.mp3` | `audio/mpeg` | `*` | `public, max-age=604800, must-revalidate` |
| `/assets/audio/*.mp3` | `audio/mpeg` | `*` | `public, max-age=604800, must-revalidate` |
| `/assets/listen/*.mp3` | `audio/mpeg` | `*` | `public, max-age=604800, must-revalidate` |
| `/assets/letters/*.jpg` | — | — | `public, max-age=604800, must-revalidate` |
| `/assets/textures/*` | — | — | `public, max-age=604800, must-revalidate` |
| `/3d_sednaya/*` | — | — | `public, max-age=604800, must-revalidate` |
| `/` | — | — | `public, max-age=60, must-revalidate` |
| `/index.html` | — | — | `public, max-age=60, must-revalidate` |
| `/listen.html` | — | — | `public, max-age=60, must-revalidate` |

Cache-Control strategy:

- **Vite-hashed bundles** (JS/CSS): `immutable` with 1-year `max-age` — the content hash in the filename changes on every build, so browsers cache forever and never re-fetch stale versions.
- **HTML shells** (`index.html`, `listen.html`): 60-second `max-age` — short cache so new deploys propagate quickly. HTML references the hashed bundle URLs, so a new deploy = new HTML = new bundles.
- **Stable binary assets** (GLB, MP3, JPG, textures): 7-day `max-age` with `must-revalidate` — filenames are stable (not hashed), so browsers cache long but check for updates after expiry.

Implications:

- Rules are parsed by Pages; `_headers` itself is not served as a public file.
- They apply to static asset responses.
- If the project later adds Pages Functions, these rules will not cover Function-generated responses.

## Exhibition listener page

- `public/listen.html` is a standalone HTML file — not processed by Vite, not a module entry point.
- It is copied as-is to `dist/listen.html` during build, like all `public/` files.
- The `/listen/*` redirect in `_redirects` routes exhibition QR code URLs to this file.
- The page reads the paper ID from `window.location.pathname` at runtime.
- It has zero dependency on the 3D archive: no Three.js, no Howler, no imports from `src/`.
- Audio files are expected at `/assets/listen/{id}_{lang}.mp3` (see `public/assets/listen/README.md`).

## Deployment-sensitive constraints

- All runtime asset references are root-absolute (`/assets/...`, `/3d_sednaya/...`).
  - This assumes deployment at the domain root.
  - There is no current `base` handling via `import.meta.env.BASE_URL`.
- Do not rename `public/_headers` or `public/_redirects`.
- Do not move `public/assets/**` unless `letters.json`, constants, and intro paths are updated together.
- Do not assume the build system fingerprints or rewrites these public assets; Pages serves them as copied files.
- If CORS/header policy changes, validate GLB and MP3 fetches in the deployed environment, not just locally.

## CI pipeline

`.github/workflows/ci.yml` runs on push and PR to `main`, alongside (not replacing) Cloudflare Pages auto-build.

Steps:
1. `npm ci`
2. `npm run validate:letters -- --strict` — content validation, fails on warnings
3. `npm run build` — production build, catches compile errors
4. Verify critical `dist/` files exist: `index.html`, `listen.html`, `_headers`, `_redirects`
5. Verify `_redirects` rule ordering: `/listen/*` must precede `/*` catch-all
6. Verify no wrong domain (`houseofdreams.site`) leaked into build output

For deploy-related skill routing, see `docs/agents/shared/13-skill-activation-matrix.md`. For browser validation after deploy-sensitive edits, use `docs/agents/shared/09-validation-checklist.md`.

## Validation after deploy-affecting edits

Use `docs/agents/shared/09-validation-checklist.md` as the default ladder, then apply these deploy-specific checks:

1. Confirm `vite.config.js`, `public/_headers`, and `public/_redirects` still match the runtime asset paths.
2. Run `npm run validate:letters` when `src/data/letters.json` or `public/assets/**` changed.
   - Use `npm run validate:letters -- --strict` when warnings should block release or CI.
3. Build locally with `npm run build` when code/config changes justify it.
4. Verify `dist/_headers` and `dist/_redirects` exist after build.
5. Smoke-test GLB, MP3, and SPA fallback behavior in a browser or deployed preview.
