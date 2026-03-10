# 14. Agent Tool Conventions

This file keeps tool and skill routing aligned with `AGENTS.md`. Use it with `09-validation-checklist.md`, `11-tool-routing.md`, `12-cross-agent-handoffs.md`, and `13-skill-activation-matrix.md`, not instead of them.

## MCP Order By Task Type

| Task type | Start here | Then use | Notes |
| --- | --- | --- | --- |
| repo grounding or docs/governance | `sequential-thinking` -> local file reads | `project-health`, then `deepwiki` only if a second opinion helps | Keep local code and checked-in docs authoritative |
| runtime implementation | `sequential-thinking` for non-trivial work -> targeted source reads | task-matched skills, then validation tools after edits | Do not start with browser automation |
| upstream library or platform semantics | local code, versions, and config | `context7` | Use only when the repo cannot answer the question locally |
| browser validation | local diff and ownership already understood | `playwright`, `responsiveness-check`, or `ux-audit` | Use after edits or for explicit UX testing; follow `09-validation-checklist.md` |
| contrastive review | grounded diff plus open questions | Claude review or `gemini-peer-review` | External review comes after local grounding, not before; see `09-validation-checklist.md` and `12-cross-agent-handoffs.md` |

## Skill Defaults And Conditionals

Default for this repo's instruction and governance work:

- `project-health`

Default for implementation work:

- no automatic skill; choose the narrowest repo-relevant skill that matches the task

Conditional skills worth activating when the task fits:

- `claude-capabilities` when making current claims about Claude surfaces or limits
- `gemini-guide` when making current claims about Gemini APIs, SDKs, or model behavior
- `gemini-peer-review` for a targeted third opinion on a grounded change
- `frontend-design-codex` or `frontend-design-claude` when the overlay or shell UI is being materially redesigned
- `dev-session` for multi-session work, checkpoints, or handoff prep
- `doc` only for real `.docx` work

## If A Tool Or Skill Is Unavailable

- no `sequential-thinking`: write a short manual execution order before editing
- no `context7`: rely on local versions, imports, and config, then state any unresolved uncertainty
- no `deepwiki`: stay local-first and continue
- no browser-validation tool: use static review plus explicit manual QA steps
- missing skill or blocked integration: continue with local evidence and state the skipped tool plainly

Do not invent behavior for unavailable tools. Record the fallback and keep moving.

## When To Escalate Across Agents

Escalate from Codex to Claude when:

- the work is grounded locally but needs a sharper review or instruction-system refinement
- the task becomes multi-session and `dev-session` or deeper repo-governance help would add value
- a non-trivial tradeoff remains after implementation or local review

Escalate from Codex or Claude to Gemini when:

- a targeted third opinion would reduce risk on a grounded change
- two plausible approaches remain and a contrastive review is useful
- the task explicitly needs Gemini-specific API or model guidance

Do not escalate before the repo is grounded in local files. Handoffs should follow `docs/agents/shared/12-cross-agent-handoffs.md`.
