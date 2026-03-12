# 17. How To Run This Workflow

Use this as the one-page operator manual for the repo. This workflow is a controlled loop, not an autonomous swarm.

The repo holds the durable memory. The human operator chooses the lane, the task size, the agent, the tools, and when parallel work is safe.

See `07-agent-workflow.md`, `09-validation-checklist.md`, `11-tool-routing.md`, `12-cross-agent-handoffs.md`, `13-skill-activation-matrix.md`, and `14-agent-tool-conventions.md` for the detailed rules behind this summary.

## Operating Model

`repo-as-memory + human orchestration + narrow task slices + explicit validation + doc synchronization + checkpoint commits`

## Memory Stack

- `AGENTS.md` is the canonical repo contract.
- `CLAUDE.md` and `GEMINI.md` are thin adapters, not competing sources of truth.
- `docs/agents/shared/*` stores the deeper project truth.
- `PLANS.md` is the live execution roadmap.
- nested `AGENTS.md` files exist only for path-specific rules.
- validators, `npm run build`, and Playwright are truth gates.

Start from files, not chat memory.

## 1. Classify The Task First

| Task size | Typical shape | Default approach |
| --- | --- | --- |
| Tiny task | one file or one narrow fix | execute directly after the local read |
| Focused task | one bounded workstream or subsystem pass | read the relevant docs first, then execute |
| Multi-step task | cross-subsystem, stateful, architectural, or sequencing-heavy work | start in planning mode, then execute in a second step |

## 2. Pick The Lane, Then The Agent

- `Codex` is the primary builder for implementation, refactors, repo-wide doc updates, and validation-aware work.
- `Claude Code` is the secondary reviewer or specialist for tricky refactors, architecture critique, alternative plans, and focused review of a grounded Codex change.
- `Gemini CLI` is the tertiary contrastive reviewer for peer review, edge cases, tie-breakers, and visual or reasoning contrast.

Default chain:

`Codex builds -> Claude reviews or refines if needed -> Gemini challenges or compares if useful`

Do not start with all three at once.

## 3. Activate Tools And Skills By Phase

- Early planning or repo understanding: `sequential-thinking`, local file reads, then `deepwiki` only as a second opinion, `context7` only for real upstream ambiguity.
- UI, UX, or browser-visible work: `playwright` plus `playwright-cli`; use `figma` only when a real design artifact exists.
- Three.js or runtime work: `sequential-thinking`, local runtime files, relevant `threejs-*` skills, and `context7` only when the repo cannot answer the library question locally.
- Validation, release, or repo health: `playwright` plus `playwright-cli`, `project-health`, and `cloudflare-deploy` only when deployment is actually in scope.

Task type determines tool activation. Tools are not always-on.

## 4. Run The Same Control Loop Every Time

### Phase A. Read

Read, in order:

1. `AGENTS.md`
2. `PLANS.md`
3. the relevant shared docs
4. the owning local code files

Fresh sessions matter after major doc or plan changes because the files, not the prior chat, are the memory.

### Phase B. Define Scope

State:

- the exact problem
- the success criteria
- the files expected to change
- what will not be touched

### Phase C. Implement

Make the smallest correct change that solves the stated problem.

### Phase D. Validate

Run only the checks that prove the changed behavior:

- validator checks when data or assets changed
- `npm run build` for build-sensitive or deploy-sensitive work
- Playwright for browser-only behavior
- targeted manual smoke checks when automation is not the right fit

### Phase E. Synchronize Docs

If project truth changed, update the matching docs in the same pass:

- `PLANS.md`
- relevant files under `docs/agents/shared/*`
- validation expectations when the proof path changed

Code is not complete if the repo truth is now stale.

### Phase F. Checkpoint

Commit the clean slice after the change and validation are coherent.

## 5. Parallelize Only After Stabilization

Do not parallelize at the start of a shifting workstream.

Parallel work is safe only when:

- the instruction layer is already stable
- the current truth has been checkpointed
- the workstreams are genuinely disjoint
- the same files or state contracts are not being redefined in parallel

Good parallel examples:

- data or asset hygiene
- isolated overlay polish

Bad parallel examples:

- two agents editing `src/main.js`
- two agents redefining shell or runtime state

Use this rule:

`stabilize -> checkpoint -> fan out`

Not this:

`fan out while the architecture is still moving`

## 6. Let Validation Decide The Next Slice

Choose the next task from evidence, not intuition.

- validator failures point to data or asset hygiene
- a clean validator plus a stable shell allows UX polish next
- Playwright regressions point to regression hardening
- runtime or docs mismatch points to truth cleanup

This makes the workflow feedback-driven, not just backlog-driven.

## Daily Usage

1. Open the repo and read `PLANS.md`.
2. Choose one narrow next slice.
3. Start a fresh `Codex` session.
4. Prompt it with `AGENTS.md`, `PLANS.md`, the relevant shared docs, and the exact files to inspect.
5. Let it implement and validate.
6. Review the diff and output.
7. Commit the slice.
8. Send the grounded result to `Claude` or `Gemini` only when the task warrants review.
9. Update `PLANS.md` with the next target.

Then repeat.

## Mental Model

- shared docs and contracts are the memory
- the human operator is the dispatcher
- `Codex`, `Claude`, and `Gemini` are workers or reviewers
- validators, builds, and Playwright are the quality gates
- Git commits are the stable checkpoints
