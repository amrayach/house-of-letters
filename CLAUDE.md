# Claude Adapter

Follow `AGENTS.md` first. It is the canonical repo instruction layer; do not restate or override it here.

Read next as needed:

- `docs/agents/shared/07-agent-workflow.md`
- `docs/agents/shared/09-validation-checklist.md`
- `docs/agents/shared/12-cross-agent-handoffs.md`
- `docs/agents/shared/13-skill-activation-matrix.md`
- `docs/agents/shared/14-agent-tool-conventions.md`
- `.claude/rules/renderer.md`
- `.claude/rules/audio.md`
- `.claude/rules/interaction.md`

`.claude/rules/*` are Claude-only subsystem deltas. Shared docs remain the canonical repo policy layer.

Recommended Claude-side skills:

- `claude-capabilities` for current Claude AI / Claude Code capability claims or environment comparisons
- `frontend-design-claude` for substantial overlay or shell UI redesign work

If this file ever drifts from `AGENTS.md`, update `AGENTS.md` first and keep this wrapper thin.
