# 07. Agent Workflow

Use this file for the standard working sequence after `AGENTS.md`.

## Task Sizing

- Tiny task: one obvious file, wording fix, or narrowly scoped static change. Usually no formal plan unless hidden coupling appears.
- Focused task: one subsystem or a small cluster of related files. Make a short plan before editing and validate the touched path.
- Multi-step refactor: cross-subsystem, code-plus-doc, or sequencing-heavy work. Plan first, stage the work, and validate at each milestone.

## Read Order

1. Read `AGENTS.md`.
2. Read `docs/agents/shared/00-project-overview.md` for current repo shape.
3. Read `docs/agents/shared/11-tool-routing.md`, `docs/agents/shared/13-skill-activation-matrix.md`, and `docs/agents/shared/14-agent-tool-conventions.md` before choosing MCPs or skills.
4. Read `docs/agents/shared/09-validation-checklist.md` before deciding what must be verified.
5. Read `docs/agents/shared/99-repo-inventory.md` if file location or ownership is unclear.
6. Read a path-local `AGENTS.md` in the touched subtree if one exists.
7. Read the local source files that actually own the task before relying on summaries.
8. Read `docs/agents/shared/12-cross-agent-handoffs.md` only when another agent may need to review or continue the work.

## When To Make A Plan

Make a plan when any of these are true:

- more than one subsystem is involved
- the change touches both code and docs
- validation needs to happen in stages
- the task includes refactoring, ownership shifts, or risk triage
- the likely path is not obvious after the first local read

For tiny tasks, skip the formal plan and move straight to the local files.

## How To Validate

- Use `docs/agents/shared/09-validation-checklist.md` as the default validation ladder.
- Run the narrowest local checks first, then the relevant runtime or build validation.
- Validate the specific interaction flow that changed rather than relying on broad manual clicking.
- Build or deploy changes still require `npm run build`.
- When validation is missing, record the gap plainly instead of implying coverage.

## When To Update Docs

Update the shared docs in the same change when behavior, ownership, constraints, tooling, or unresolved questions changed.

- `01-architecture.md` for ownership or boundary changes
- `02-runtime-flow.md` for sequencing or lifecycle changes
- `03-data-assets.md` for schema, asset, or path rules
- `04-build-deploy.md` for scripts, Vite, or Pages behavior
- `05-constraints.md` for new guardrails or regression patterns
- `06-open-questions.md` for unresolved risk or known follow-up work
- `09-validation-checklist.md` for validation or peer-review process changes
- `11-tool-routing.md`, `12-cross-agent-handoffs.md`, `13-skill-activation-matrix.md`, or `14-agent-tool-conventions.md` for tool, handoff, or skill-routing changes

If the change only clarifies agent process or tool usage, update the relevant file under `docs/agents/shared/` instead of adding a new source of truth elsewhere.

## Why Some Directories Do Not Have Local AGENTS Files

Create a nested `AGENTS.md` only when a directory has enough path-local ownership, risk, or validation detail that focused work benefits from it.

- `src/audio/` does not currently get a local `AGENTS.md` because it has only two files and its critical conventions are already captured cleanly in `01-architecture.md` and `.claude/rules/audio.md`.
- `src/interaction/` does not currently get a local `AGENTS.md` because its main rules already fit in `01-architecture.md` and `.claude/rules/interaction.md`; at its current size, another file would mostly restate threshold and coupling guidance.

## How To Report Risky Findings

Raise risky findings as soon as they are grounded in local evidence.

Include:

- the risk or defect
- why it matters
- the exact file or subsystem involved
- what is confirmed versus assumed
- the validation still needed, if any

If acting as a reviewer, lead with findings ordered by severity. If implementing, call out risks before or alongside the fix, not after the fact.
