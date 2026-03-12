# 11. Tool Routing

## Repo baseline

This repository is currently a client-side `Vite + Three.js + Howler + Cloudflare Pages` project.

Local evidence:

- `package.json` contains `vite`, `three`, `howler`, `postprocessing`, and `vite-plugin-glsl`.
- `vite.config.js` defines Vite aliases and GLB asset handling.
- `public/_headers` and `public/_redirects` are Cloudflare Pages deployment files.
- `src/main.js` orchestrates rendering, audio, loading flow, and interaction.
- `src/config/constants.js` and `src/data/letters.json` are central configuration/content sources.
- There is no current React, Tailwind, API route, database, or Cloudflare Worker runtime in the source tree.

## Evidence priority

Use sources in this order:

1. Runtime code: `src/main.js`, `src/renderer/*`, `src/audio/*`, `src/interaction/*`, `src/utils/*`
2. Config and content: `package.json`, `vite.config.js`, `index.html`, `public/_headers`, `public/_redirects`, `src/config/constants.js`, `src/data/letters.json`
3. Local project docs such as `README.md`
4. Checked-in generated docs under `docs/`
5. External MCP output

If level 4 or 5 disagrees with levels 1 or 2, local code wins.

## Default invocation order

1. Use `sequential-thinking` once at the start for non-trivial setup, routing, refactor, or review tasks.
2. Read local code with shell tools first: `rg`, `sed`, `find`, `git`, and targeted file reads.
3. Use `deepwiki` only after the local read, as a repo-level second opinion.
4. Use `context7` only if the task still needs current official docs for `Vite`, `Three.js`, `Howler`, `Cloudflare Pages`, or AGENTS-style instruction patterns.
5. Use validation tools such as the `playwright` skill plus `playwright-cli`, `responsiveness-check`, or `ux-audit` only after code or content changes, following `docs/agents/shared/09-validation-checklist.md`.
6. Use `figma` only when a real Figma file, frame, or node is provided for inspection or handoff.

General web browsing is not the default route for this repo. Prefer local evidence and only escalate to official library/platform docs when local code leaves a real ambiguity.

## Tool routing by phase

| Phase | Primary source of truth | Tool route | Why |
| --- | --- | --- | --- |
| Task framing | User request plus local repo shape | `sequential-thinking` -> local file read | Breaks multi-step work into a concrete order before acting |
| Repo understanding | Local code and config | shell tools only, then optional `deepwiki` | Source files are more reliable than generated summaries |
| Architecture cross-check | Local conclusions already formed | `deepwiki` | Good for repo-level summaries and finding likely blind spots |
| Library/platform clarification | Local code plus exact package/deploy target | `context7` | Useful only for current upstream behavior that local code cannot answer |
| Implementation | Local code | shell tools, edits, local verification | Runtime behavior lives here, not in external summaries |
| UX and browser validation | Running app behavior | `playwright` skill + `playwright-cli`, `responsiveness-check`, `ux-audit` | Confirms interaction, responsive layout, and regression risk; use `09-validation-checklist.md` for the exact ladder |
| Design inspection | Real design artifact | `figma` | Only relevant when an actual file/frame/node exists |

## When not to use each route

### `sequential-thinking`

Do not use it for trivial one-file edits, obvious typo fixes, or tasks where the execution path is already linear and short.

### `deepwiki`

Do not use it:

- before reading the local code
- for line-level or current-runtime claims
- to settle conflicts between docs and code
- when the GitHub repo is unavailable and the local repo already contains enough evidence

### `context7`

Do not use it:

- for repo structure, file ownership, or current app behavior
- when `package.json`, imports, or source code already answer the question
- to suggest framework migrations that are not present in the repo
- for React, Tailwind, API, or database guidance unless the repo scope actually changes

### `playwright` plus `playwright-cli`

Do not use this route as a primary code-understanding tool. It validates browser behavior; it does not replace reading `src/main.js`, subsystem modules, or config files. Prefer the `playwright` skill's wrapper workflow when possible; use the installed `playwright-cli` binary directly when that is the simpler path.

### `figma`

Do not use it without a real Figma file key and a concrete frame/node/selection. This repo currently has no default Figma artifact in scope.

## Fallback behavior

| Tool/route | If unavailable | Fallback |
| --- | --- | --- |
| `sequential-thinking` | No planning MCP available | Write a short manual execution order in the task notes or working commentary |
| `deepwiki` | Repo lookup fails, remote missing, or service unavailable | Stay local-first and rely on code, `README.md`, and checked-in docs |
| `context7` | Official docs lookup unavailable | Use locked versions in `package.json`, source imports, and local config; call out any unresolved uncertainty explicitly |
| `playwright` + `playwright-cli` | Browser CLI automation unavailable, wrapper blocked, or `npx` missing | Use static review plus manual QA instructions; record the validation gap |
| `figma` | Figma MCP unavailable or no node/file provided | Keep the task in code/docs space and note that design inspection was skipped |

## Rules for keeping external context subordinate

- Always cite the local file that anchors a claim before using external context to enrich it.
- Treat `docs/` content as secondary because it may be generated from DeepWiki and can lag the checked-out code.
- If external context conflicts with local code, follow local code and note the discrepancy.
- Use external context to explain library or platform behavior, not to redefine repo architecture.
- Keep MCP lookups narrow and purpose-built. Do not replace repository reading with generic external summaries.
- For this repo, deployment truth comes from `public/_headers`, `public/_redirects`, and the Vite build config, not from generic Cloudflare guidance.
- For this repo, runtime truth comes from `src/main.js` and the renderer/audio/interaction modules, not from generated architecture docs.
