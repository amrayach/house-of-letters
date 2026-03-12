# 13. Skill Activation Matrix

## Scope lock

Classify skills against the repo that exists today, not against speculative future plans.

Current repo scope:

- `Vite + Three.js + Howler + Cloudflare Pages`
- client-side interactive 3D experience
- asset-heavy renderer/audio/interaction code
- no React
- no Tailwind
- no API layer
- no database
- no Cloudflare Worker runtime

Implications:

- React, Tailwind, API, and DB skills stay parked until the codebase actually grows those layers.
- Browser validation defaults to the `playwright` skill plus `playwright-cli`, not the Playwright MCP.
- `playwright` and `playwright-cli` are validation and UX tools, not primary code-understanding tools.
- Figma is conditional only when a real file/frame/node exists to inspect.

## Active now

| Skill | Current status | Intended phase | Trigger conditions | Why it is relevant to this repo today |
| --- | --- | --- | --- | --- |
| `cloudflare-deploy` | active now | deploy | publish, host, configure Pages | Cloudflare Pages is the current deployment target |
| `image-processing` | active now | asset prep, optimization | resize, crop, convert, optimize images | The repo ships image-heavy letter assets and likely needs asset hygiene |
| `playwright` | active now | validation, UX | browser flow test, wrapper-script guidance, screenshots, debugging | The repo now prefers this skill's CLI-first browser workflow instead of the Playwright MCP |
| `playwright-cli` | active now | validation, UX | direct browser commands, snapshots, screenshots, debugging | The installed CLI is now part of the default browser-validation path for this repo |
| `project-health` | active now | repo governance | agent-doc upkeep, settings audit, context cleanup | The repo is actively growing its guidance and documentation layer |
| `responsiveness-check` | active now | validation | mobile breakpoint, touch layout, viewport sweep | The app has mobile/touch controls and adaptive HUD elements |
| `threejs-animation` | active now | implementation, refinement | letter motion, cinematic timing, camera movement | Animation is part of the experience and loading scene |
| `threejs-fundamentals` | active now | implementation | scene, camera, renderer, transforms | The whole app is structured around Three.js fundamentals |
| `threejs-geometry` | active now | implementation | mesh setup, helper geometry, custom lines, instancing | The repo already creates custom geometry such as letter strings and scene helpers |
| `threejs-interaction` | active now | implementation, debugging | controls, proximity, input behavior, selection | Input and proximity systems are first-class runtime concerns |
| `threejs-lighting` | active now | implementation, tuning | scene lighting, balance, visibility fixes | Lighting choices directly affect letter legibility |
| `threejs-loaders` | active now | implementation, performance | GLB loading, asset loading, load failures | Model loading is central to the experience |
| `threejs-materials` | active now | implementation, debugging | material fixes, transparency, texture handling | Letter and glass materials are actively manipulated in code |
| `threejs-postprocessing` | active now | implementation, visual tuning | bloom, vignette, chromatic aberration, effect composer | `postprocessing` is already part of the loading scene pipeline |
| `threejs-textures` | active now | implementation, debugging | texture mapping, color space, image fidelity | The repo depends on scanned letter textures looking correct |
| `ux-audit` | active now | validation, review | dogfood the experience, friction review, flow audit | The project is an experiential archive, so UX quality is core |

## Conditional

| Skill | Current status | Intended phase | Trigger conditions | Why it is relevant or not relevant to this repo today |
| --- | --- | --- | --- | --- |
| `claude-capabilities` | conditional | review, planning | compare Claude environments or limits | Only relevant when choosing Claude surfaces or capability claims |
| `color-palette` | conditional | design refresh | introduce a stronger color system | Useful if the overlay UI gets a deliberate palette pass |
| `dev-session` | conditional | long-running work | multi-session refactor, checkpoint, resume | Helpful for longer workstreams, but not required for every task |
| `favicon-gen` | conditional | branding | add or replace favicon assets | Relevant only if site branding work is requested |
| `frontend-design-claude` | conditional | UI redesign | substantial HTML/CSS overlay or landing-page work | Useful for visual polish, but the repo is not primarily a marketing UI today |
| `frontend-design-codex` | conditional | UI redesign | intentional redesign of screens or shell UI | Same as above; useful when the non-3D shell changes materially |
| `gemini-image-gen` | conditional | asset creation | generate images, textures, or promotional art | Only relevant if the project decides to add generated imagery |
| `gemini-peer-review` | conditional | tertiary review | ask Gemini for a second opinion | Useful for contrastive review, not for normal implementation |
| `github-release` | conditional | release | prepare a public release or tagged version | Relevant when the project is ready to publish a release |
| `icon-set-generator` | conditional | UI asset work | create a matching icon set | Helpful if the overlay UI expands and needs consistent icons |
| `imagegen` | conditional | asset creation | OpenAI image generation or edits | Only relevant if new generated artwork is requested |
| `pdf` | conditional | export, review | generate or inspect PDF artifacts | Not part of runtime today, but possible for archive deliverables |
| `screenshot` | conditional | review, QA | system-level capture outside browser tools | Useful when browser screenshots are insufficient |
| `security-best-practices` | conditional | security review | explicit secure-by-default review request | Relevant only on explicit security asks |
| `security-threat-model` | conditional | security review | explicit threat-model request | Same as above; not a default repo workflow |
| `skill-creator` | conditional | meta tooling | create a repo-specific skill later | Relevant only if the guidance system grows into custom skills |
| `skill-installer` | conditional | meta tooling | install more skills into the environment | Useful only if the current skill set becomes insufficient |
| `team-update` | conditional | collaboration | post updates or collect team feedback | Useful if a real team-chat workflow is configured |
| `theme-factory` | conditional | presentation | theme a deck, report, or landing artifact | Only relevant for presentation deliverables, not runtime code |
| `threejs-shaders` | conditional | advanced rendering | add custom GLSL or shader-based effects | `vite-plugin-glsl` is present, but there are no current shader files in scope |
| `web-design-methodology` | conditional | UI implementation | formalize responsive HTML/CSS patterns | Useful when working on the overlay UI or docs site shell |
| `web-design-patterns` | conditional | UI planning | redesign sections, panels, CTAs, or support pages | Helpful for non-3D UI work, not for core engine logic |

## Parked

| Skill | Current status | Intended phase | Trigger conditions | Why it is not relevant to this repo today |
| --- | --- | --- | --- | --- |
| `cloudflare-worker-builder` | parked | n/a | add a Worker runtime | The current deployment target is Cloudflare Pages, not Workers code |
| `d1-drizzle-schema` | parked | n/a | add a database layer | No database or Drizzle schema exists in the repo |
| `doc` | parked | n/a | create or edit `.docx` files | This repo is using Markdown docs, not DOCX artifacts |
| `gemini-guide` | parked | n/a | add Gemini SDK or API usage | The repo does not use Gemini APIs |
| `hono-api-scaffolder` | parked | n/a | build Hono API routes | There is no API server in the current codebase |
| `jupyter-notebook` | parked | n/a | add exploratory notebooks | Not part of the current app or docs workflow |
| `netlify-deploy` | parked | n/a | move deployment to Netlify | Deployment is currently Cloudflare Pages |
| `seo-local-business` | parked | n/a | build local-business SEO artifacts | This is not a local-business website |
| `shadcn-ui` | parked | n/a | add shadcn components | There is no React or Tailwind stack here |
| `slides` | parked | n/a | build presentation decks | Not part of current repo scope |
| `spreadsheet` | parked | n/a | edit `.xlsx` or `.csv` deliverables | Not part of current runtime or docs flow |
| `spreadsheets` | parked | n/a | artifact-tool spreadsheet work | Not part of current repo scope |
| `tailwind-theme-builder` | parked | n/a | add Tailwind v4 theming | There is no Tailwind setup in the repo |
| `tanstack-start` | parked | n/a | rebuild around TanStack Start | The current app is a plain Vite project |
| `vercel-react-best-practices` | parked | n/a | optimize React or Next.js code | There is no React or Next.js code in the repo |
| `vite-flare-starter` | parked | n/a | re-bootstrap from the starter | The project already exists and does not use that stack today |

## Adjacent MCPs not represented as skills

| Tool | Current status | Intended phase | Trigger conditions | Why |
| --- | --- | --- | --- | --- |
| `figma` | conditional | design inspection, handoff | a real Figma file key plus frame/node/selection exists | There is no default Figma artifact in this repo today |
| `sequential-thinking` | active now | task framing | non-trivial setup, routing, refactor, or review | It helps stage complex work before local repo reading |
| `deepwiki` | conditional | repo-level cross-check | local read already done and a second opinion is useful | Helpful as a summary layer, but always subordinate to local code |
| `context7` | conditional | official docs lookup | current Vite, Three.js, Howler, Cloudflare Pages, or AGENTS-style docs are needed | Useful for upstream behavior, not repo architecture |
