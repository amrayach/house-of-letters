# Gemini Adapter

Follow `AGENTS.md` first. It is the canonical repo instruction layer; do not restate or override it here.

Read next as needed:

- `docs/agents/shared/07-agent-workflow.md`
- `docs/agents/shared/09-validation-checklist.md`
- `docs/agents/shared/11-tool-routing.md`
- `docs/agents/shared/12-cross-agent-handoffs.md`
- `docs/agents/shared/13-skill-activation-matrix.md`
- `docs/agents/shared/14-agent-tool-conventions.md`

Recommended Gemini-side skills:

- `gemini-guide` for current Gemini SDK, API, or model semantics
- `gemini-peer-review` for targeted third-opinion review after local grounding
- `gemini-image-gen` when visual ideation or generated imagery is explicitly part of the task

If this file ever drifts from `AGENTS.md`, update `AGENTS.md` first and keep this wrapper thin.
