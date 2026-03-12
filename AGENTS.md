# Agent Guide

This repository is a `Vite + Three.js` interactive archive / letter experience. It boots from `index.html` into `src/main.js`, uses `src/data/letters.json` as runtime content, and deploys to Cloudflare Pages.

## Read First

Highest-priority code:

- `package.json`
- `vite.config.js`
- `index.html`
- `src/main.js`
- `src/config/constants.js`
- `src/data/letters.json`
- the touched subsystem under `src/renderer/`, `src/audio/`, `src/interaction/`, or `src/utils/`

Highest-priority docs:

- `docs/agents/shared/00-project-overview.md`
- `docs/agents/shared/01-architecture.md`
- `docs/agents/shared/05-constraints.md`
- `docs/agents/shared/07-agent-workflow.md`
- `docs/agents/shared/09-validation-checklist.md`
- `docs/agents/shared/11-tool-routing.md`
- `docs/agents/shared/12-cross-agent-handoffs.md`
- `docs/agents/shared/13-skill-activation-matrix.md`
- `docs/agents/shared/14-agent-tool-conventions.md`
- `docs/agents/shared/99-repo-inventory.md`

## Edit Strategy

- Inspect local code before relying on summaries, generated docs, or external tooling.
- Keep changes minimal, architecture-preserving, and scoped to the task.
- Avoid noisy or generated paths such as `dist/`, `node_modules/`, and bulky asset trees unless the task explicitly requires them.
- Make a plan first for non-trivial work: multi-file edits, cross-subsystem changes, refactors, or work that needs staged validation.

## Validation After Edits

- Use `docs/agents/shared/09-validation-checklist.md` as the default pre-edit and post-edit validation ladder.
- Build or deploy edits still require `npm run build`.
- If validation cannot be run, say exactly what remains unverified.

## Documentation Updates

Update shared docs in the same pass when behavior, ownership, constraints, validation, or tool-routing expectations change. Use `docs/agents/shared/09-validation-checklist.md` for the concrete update targets under `docs/agents/shared/01-06` and `11-14`.

## MCP And Skill Norms

- Use `sequential-thinking` first for non-trivial tasks.
- Read local files before `deepwiki`; use `deepwiki` only as a second opinion.
- Use `context7` only for current upstream semantics the repo cannot answer locally.
- For browser automation or browser-visible validation, prefer the `playwright` skill plus `playwright-cli`; do not default to the Playwright MCP for this repo.
- Use validation tools after changes, not for first-pass repo understanding.
- Prefer the repo-specific routing in `docs/agents/shared/11-tool-routing.md`, `docs/agents/shared/13-skill-activation-matrix.md`, and `docs/agents/shared/14-agent-tool-conventions.md` over ad hoc skill lists in wrappers.

Deeper guidance lives in `docs/agents/shared/*`.

`AGENTS.md` is canonical. `CLAUDE.md` and `GEMINI.md` are adapters and should not become competing sources of truth.
