# 09. Validation Checklist

Use this as the default pre-edit and post-edit checklist for repo work. If a task-specific doc adds stronger checks, do both.

## Pre-edit checks

1. Confirm the task type: docs-only, code/config, build/deploy, or browser-visible behavior.
2. Read `AGENTS.md`, the owning local files, and the relevant shared docs before deciding tools or validation.
3. Decide whether the task is non-trivial enough to start with `sequential-thinking`.
4. Mark which files may need doc updates in `docs/agents/shared/01-06` or `11-14` if behavior, constraints, validation, or routing will change.
5. Choose the lightest tool path that can prove the result:
   - local reads first
   - external docs only for real upstream ambiguity
   - browser tools only for browser-only behavior
6. If `src/data/letters.json` or `public/assets/**` may change, plan to run `npm run validate:letters`.

## Post-edit checks for docs-only tasks

1. Verify file names, headings, anchors, and cross-references still resolve.
2. Check that wrappers stay thin and do not restate shared policy.
3. Remove duplicated guidance when a cross-reference is enough.
4. Inspect stale file references and broken markdown links.
5. Confirm changed docs still match the checked-out repo and not only older summaries.
6. If docs cite screenshots, logs, or output artifacts as evidence, confirm those files actually exist in-repo or rewrite the claim as historical context only.
7. If docs describe runtime sequencing, confirm they match the current staged boot path in `src/main.js`.
8. Confirm no doc still claims the archive waits for all letters before entry if the code now gates only on the core startup subset.
9. State manual-only device or pointer-lock gaps explicitly instead of implying equivalent automated coverage.

## Post-edit checks for code tasks

1. Run the narrowest local checks first:
   - imports
   - file paths
   - schema or data-shape assumptions
   - asset existence when paths changed
   - `npm run validate:letters` when the archive content pipeline changed
   - `npm run validate:letters -- --strict` when warnings should also fail
2. Run the smallest task-matched validation path after that:
   - static inspection for clearly static changes
   - runtime flow checks for behavior changes
   - targeted browser checks for UI or interaction changes
3. Record exactly what was and was not verified.
4. If code changes alter behavior, constraints, validation, or tool routing, update the matching shared docs in the same pass.

## Build/deploy checks

Run `npm run build` after changes to build config, deploy config, public asset pathing, or other deployment-sensitive behavior.

Then verify:

1. expected build artifacts exist
2. copied deploy files such as `dist/_headers` and `dist/_redirects` still exist when relevant
3. preview or deployed routing and asset fetch behavior still match the repo assumptions

## Visual/manual smoke-test guidance

Prefer a targeted flow over generic clicking. Re-test the exact path the change can break.

For this repo, the common browser smoke-test paths are:

- loading intro completion and skip
- core-only startup load reaching the start shell without waiting for deferred zones
- start and pause handoff
- deferred zone 3/4 loading starting only after successful archive entry
- late-loaded letters becoming available inside the live session without a reload
- deferred degraded or failed sessions keeping the active session alive
- desktop degraded status text through `#controls-hint`
- touch degraded status pill visibility only during active immersive touch sessions
- shell exclusivity during loading, start, and pause
- bird's-eye exit on desktop pause/unlock
- desktop pointer lock when input changed
- desktop pointer-lock denial or interruption when re-entry changed
- mobile touch controls when touch UI changed
- tab hide/show while active versus paused when audio changed
- proximity-driven narration, preview, and subtitle behavior only after active entry
- dense-cluster targeting and candidate-prompt behavior when letter selection changed
- ground chronology first reveal, delayed initialization until full required coverage, safe absence when deferred coverage stays incomplete, ambient roaming persistence, single-label promotion, pause/resume hiding, inspect-adjacent freeze, and bird's-eye hiding when the floor navigation thread changed
- inspect prompt, inspect enter/front/back/zoom/reset/exit, desktop inspect unlock/relock, and inspect-only shell exclusivity when readability work changed
- pause/unlock from inspect plus bird's-eye/inspect mutual exclusion when either mode changed
- visible asset failures in the browser console or network panel
- responsive HUD/layout only when viewport-sensitive UI changed

## Automated vs manual smoke guidance

Prefer automation for:

- shell exclusivity and overlay visibility
- touch or emulated-mobile inspect flows
- forced deferred degraded paths by blocking one deferred late-letter asset
- checking that late-letter integration and `document.body.dataset.groundTimelineCoverage` reflect the expected deferred outcome
- console or network evidence
- responsive inspect layout and button-state checks

Prefer manual smoke for:

- desktop pointer-lock acquisition and re-entry
- physical iOS/Android degraded-session checks for touch-pill placement against the pause button and browser safe areas
- live free-walk precision and overshoot feel around letter clusters
- how clearly the ground chronology thread remains followable while moving versus slowing near a target
- inspect behavior while pointer lock is actually captured

When automation cannot cover the path cleanly, record the exact manual steps exercised and the remaining gap instead of implying equivalent coverage.

## Archive content/data checks

Run `npm run validate:letters` when the task changes:

- `src/data/letters.json`
- asset paths under `public/assets/**`
- documentation that claims specific runtime data/asset behavior

Treat the validator as the canonical local check for:

- `letters.json` parse/shape errors
- duplicate IDs
- invalid zone values
- missing model/image/audio files
- optional-field fallbacks versus hard failures
- orphaned model/image/audio assets
- warning-only contract drift when run with `--strict`
- when GLBs or scene-side texture fidelity are in scope, add representative `gltf-transform inspect` and `gltf-transform validate` checks before choosing compression, re-export, or texture-format changes

## Current staged-runtime proof path

Use this narrower proof ladder for the current boot and deferred-loading runtime:

1. Read `src/main.js` first to confirm:
   - zones 1 and 2 gate entry as the core startup subset
   - zones 3 and 4 defer until successful archive entry
   - deferred late-letter state stays owned by `main.js`
2. Run `npm run validate:letters` for the current data and asset contract.
3. Run `npm run build` when the task touches deploy-sensitive behavior or when a checkpoint needs fresh build proof.
4. For browser-visible deferred behavior, force a degraded session by blocking one deferred GLB and verify:
   - active play continues
   - `document.body.dataset.deferredLetterLoadStatus` settles to `degraded` or `failed`
   - desktop `#controls-hint` or touch `#touch-deferred-status` surfaces the expected message
   - `document.body.dataset.groundTimelineCoverage` remains `incomplete` when required coverage is still missing
5. Record any manual-only gaps honestly:
   - desktop pointer-lock remains manual-first
   - physical iOS Safari and Android Chrome placement for the touch deferred-status pill remain manual-only until captured on real devices

## CI automated gate

`.github/workflows/ci.yml` runs on every push/PR to `main` and catches:
- broken letter data or asset paths (`validate:letters --strict`)
- compile errors and missing imports (`build`)
- missing critical dist files (`index.html`, `listen/index.html`, `_headers`, `_redirects`)
- wrong domain (`houseofdreams.site`) in build output

Manual checks after domain-referencing edits:
- `grep -r "houseofdreams\.site" .` — must return zero results
- verify `_headers` covers all 14 path patterns after any asset-type addition

## Exhibition listener checks

After `_headers` changes:
- verify all cache-control rules are present in `dist/_headers`
- confirm existing Content-Type and CORS rules for GLB/MP3 are preserved

After listener page changes:
- confirm `dist/listen/index.html` exists after build
- verify `public/listen/index.html` is under 20KB (`wc -c`)
- confirm it has no imports from `src/`
- test edge-case URLs: `/listen/?p=abc`, `/listen/?p=0`, `/listen/?p=99` should show the error state
- test `/listen/?p=1` through `/listen/?p=11` show correct Arabic names and date spans
- test language toggle switches `dir="rtl"` for Arabic and hides the English paper label

## When to use `playwright` plus `playwright-cli`

Use the `playwright` skill plus `playwright-cli` when:

- the changed behavior only exists in a browser
- you need console or network evidence
- manual reproduction is repetitive or error-prone
- deployed or preview behavior differs from static reasoning
- you can validate the flow without over-claiming desktop pointer-lock coverage

Do not use this browser-automation path:

- for first-pass repo understanding
- for docs-only edits
- as a substitute for reading the owning local code

For this repo, desktop pointer-lock flows are partial-automation territory at best. Use browser automation around them when helpful, but keep captured-pointer movement/inspect behavior in the manual-smoke bucket unless you have direct evidence otherwise.

## When to update docs after code changes

Update shared docs in the same change when code changes affect:

- ownership or boundaries -> `01-architecture.md`
- sequencing or lifecycle -> `02-runtime-flow.md`
- data shape, assets, or path rules -> `03-data-assets.md`
- scripts, Vite, or deploy behavior -> `04-build-deploy.md`
- new guardrails or regression patterns -> `05-constraints.md`
- unresolved follow-up risk -> `06-open-questions.md`
- validation expectations -> `09-validation-checklist.md`
- tool routing -> `11-tool-routing.md`
- handoff expectations -> `12-cross-agent-handoffs.md`
- skill activation defaults -> `13-skill-activation-matrix.md`
- tool or escalation conventions -> `14-agent-tool-conventions.md`

## When to request Claude/Gemini peer review

Request peer review only after the task is grounded locally and the primary implementation path is already understood.

Use Claude review when:

- a grounded change needs a sharper review pass
- repo-governance or instruction-system cleanup is involved
- a complex refactor still has unresolved tradeoffs

Use Gemini review when:

- a targeted third opinion could reduce risk
- security, edge-case, or architecture reasoning needs contrast
- two grounded approaches remain plausible and need a tie-breaker

For either handoff:

- send the minimum diff and context needed
- redact secrets, tokens, credentials, and unrelated sensitive data
- do not outsource the initial repo read or broad task framing
