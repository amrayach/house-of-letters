# 12. Cross-Agent Handoffs

## Role assignment

This repo should route work across agents in a fixed order:

1. `Codex` is the primary implementation agent.
2. `Claude Code` is the secondary deep-review and focused-refinement agent.
3. `Gemini CLI` is the tertiary peer-review and contrastive-review agent.

That ordering matches the current repo shape: a local-first Vite application with hands-on source inspection as the main path, and external agents used to sharpen review rather than replace implementation ownership.

## Shared starting context

All agents should assume the same baseline:

- The repo is currently `Vite + Three.js + Howler + Cloudflare Pages`.
- `src/main.js` is the orchestrator.
- `src/config/constants.js` and `src/data/letters.json` centralize behavior and content.
- `public/_headers` and `public/_redirects` define deploy behavior.
- There is no current React, Tailwind, API, database, or Cloudflare Worker runtime.

## Which shared docs to read first

### Codex

Read in this order:

1. `docs/agents/shared/11-tool-routing.md`
2. `docs/agents/shared/13-skill-activation-matrix.md`
3. `docs/agents/shared/12-cross-agent-handoffs.md`

Then read the local source of truth for the task:

1. `README.md`
2. `package.json`
3. `vite.config.js`
4. `index.html`
5. `src/main.js`
6. `src/config/constants.js`
7. `src/data/letters.json`
8. The touched subsystem folder under `src/renderer`, `src/audio`, `src/interaction`, or `src/utils`

### Claude Code

Read in this order:

1. `docs/agents/shared/12-cross-agent-handoffs.md`
2. `docs/agents/shared/11-tool-routing.md`
3. `docs/agents/shared/13-skill-activation-matrix.md`

Then read the exact handoff payload:

1. task goal
2. diff or touched files
3. validation already run or still missing
4. unresolved risks or review questions

Claude Code should not restart from broad repo exploration if the handoff is already focused.

### Gemini CLI

Read in this order:

1. `docs/agents/shared/12-cross-agent-handoffs.md`
2. the narrow problem statement or review question
3. the minimal diff or local file excerpts needed for that question
4. `docs/agents/shared/11-tool-routing.md` only if tool policy matters to the review

Gemini CLI should not be given open-ended control of repo interpretation when a targeted contrastive review is enough.

## Agent responsibilities

| Agent | Primary job | Best use | Avoid |
| --- | --- | --- | --- |
| `Codex` | implementation owner | reading local code, editing files, running local validation, keeping the repo moving | delegating core repo understanding to external summaries |
| `Claude Code` | secondary reviewer/refiner | deeper review, sharper task decomposition, instruction-system cleanup, repo hygiene | becoming the first-pass source of truth when Codex has not grounded the problem locally |
| `Gemini CLI` | tertiary peer reviewer | adversarial review, alternate reasoning, tie-breaker perspective on risky changes | open-ended architecture authority or primary implementation ownership |

## Default handoff triggers

### Hand off from Codex to Claude Code when

- a change set is implemented and needs a tighter review pass
- the task becomes multi-session and needs durable session/repo-governance handling
- the repo instructions or documentation system need focused refinement
- there is an unresolved tradeoff and a deeper second pass is worth the time

### Hand off from Codex or Claude Code to Gemini CLI when

- two grounded approaches remain plausible
- a security, architecture, or edge-case review would benefit from contrastive reasoning
- a change is high-risk and a tertiary peer review is cheaper than a regression

### Do not hand off when

- the issue is still ungrounded in local code
- the question can be answered directly from the touched files
- the receiving agent would only repeat the same broad repo scan

## Required handoff packet

Every cross-agent handoff should include:

- the exact task goal
- current repo stack: `Vite + Three.js + Howler + Cloudflare Pages`
- the files already read
- the files changed or proposed for change
- the validation already performed and the validation still missing
- unresolved questions, risks, or assumptions
- any external context used and whether it conflicted with local code
- only the minimum diff, excerpts, and repo context needed for the review

Never include secrets, tokens, credentials, or broad unrelated file dumps in a peer-review handoff.

## Skill ownership by agent

### Primarily Codex

- `playwright`
- `playwright-cli`
- `responsiveness-check`
- `ux-audit`
- `threejs-*`
- `image-processing`
- `cloudflare-deploy`
- `frontend-design-codex` when the overlay UI or site shell changes

These fit implementation and validation work tied directly to the current repo.

### Primarily Claude Code

- `dev-session`
- `project-health`
- `team-update`
- `claude-capabilities`
- `frontend-design-claude`
- `github-release`
- `security-best-practices`
- `security-threat-model`

These fit review, repo-governance, release, and collaboration workflows more than day-to-day local implementation.

### Primarily Gemini CLI

- `gemini-peer-review`
- `gemini-guide`
- `gemini-image-gen`

These only make sense when Gemini is intentionally being used as the external reviewer or content generator.

### Shared, task-specific skills

- `doc`, `pdf`, `spreadsheet`, `spreadsheets`, and `slides` are deliverable-specific, not agent-specific.
- `web-design-methodology`, `web-design-patterns`, `favicon-gen`, `icon-set-generator`, and `theme-factory` are conditional helpers when the task shifts toward presentation or design work.

## Handoff discipline

- Codex owns the first grounded read of the repo.
- Claude Code should refine or challenge a grounded implementation path, not replace the local-first read.
- Gemini CLI should review a framed question, not discover the repo from scratch.
- Use `docs/agents/shared/09-validation-checklist.md` to decide when peer review is worth the extra hop.
- If any external agent output conflicts with local code, the local repo stays authoritative.
