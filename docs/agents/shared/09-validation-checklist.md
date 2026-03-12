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
- start and pause handoff
- shell exclusivity during loading, start, and pause
- bird's-eye exit on desktop pause/unlock
- desktop pointer lock when input changed
- desktop pointer-lock denial or interruption when re-entry changed
- mobile touch controls when touch UI changed
- tab hide/show while active versus paused when audio changed
- proximity-driven narration, preview, and subtitle behavior only after active entry
- dense-cluster targeting and candidate-prompt behavior when letter selection changed
- inspect prompt, inspect enter/front/back/zoom/reset/exit, desktop inspect unlock/relock, and inspect-only shell exclusivity when readability work changed
- pause/unlock from inspect plus bird's-eye/inspect mutual exclusion when either mode changed
- visible asset failures in the browser console or network panel
- responsive HUD/layout only when viewport-sensitive UI changed

## Automated vs manual smoke guidance

Prefer automation for:

- shell exclusivity and overlay visibility
- touch or emulated-mobile inspect flows
- console or network evidence
- responsive inspect layout and button-state checks

Prefer manual smoke for:

- desktop pointer-lock acquisition and re-entry
- live free-walk precision and overshoot feel around letter clusters
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
