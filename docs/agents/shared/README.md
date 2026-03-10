# Shared Agent Docs

Use this directory as the local-first briefing set for future sessions.

## Read order by task

### Fresh session / quick orientation

1. `00-project-overview.md`
2. `README.md`
3. `99-repo-inventory.md`
4. `11-tool-routing.md`
5. `13-skill-activation-matrix.md`

### Runtime edit

1. `01-architecture.md`
2. `02-runtime-flow.md`
3. `05-constraints.md`
4. touched subsystem files under `src/`

### Data or asset edit

1. `03-data-assets.md`
2. `05-constraints.md`
3. `04-build-deploy.md` if paths or deploy behavior change

### Build/deploy edit

1. `04-build-deploy.md`
2. `05-constraints.md`
3. `11-tool-routing.md`

### Planning or refactor triage

1. `06-open-questions.md`
2. `07-agent-workflow.md`
3. `01-architecture.md`
4. `02-runtime-flow.md`

### Agent workflow or tool routing

1. `07-agent-workflow.md`
2. `09-validation-checklist.md`
3. `08-deepwiki-integration.md`
4. `11-tool-routing.md`
5. `12-cross-agent-handoffs.md`
6. `13-skill-activation-matrix.md`
7. `14-agent-tool-conventions.md`

## File index

| File | Read when | Focus |
| --- | --- | --- |
| `00-project-overview.md` | first-pass repo snapshot | stack, subsystem status, known mismatches |
| `01-architecture.md` | changing boundaries or ownership | subsystem map, import flow, ownership rules |
| `02-runtime-flow.md` | changing sequencing or lifecycle | boot flow, start/pause behavior, render loop, cleanup |
| `03-data-assets.md` | editing JSON or public assets | schema, path conventions, safe/unsafe mass edits |
| `04-build-deploy.md` | touching Vite or Pages config | scripts, aliases, public asset behavior, Pages rules |
| `05-constraints.md` | before any non-trivial edit | hard boundaries, likely regressions, validation ladder |
| `06-open-questions.md` | choosing next work | placeholders, stale claims, refactor risks |
| `07-agent-workflow.md` | standard future-agent execution | read order, task sizing, planning, validation, risk reporting |
| `09-validation-checklist.md` | deciding what to verify before and after edits | pre-edit checks, task-based validation, Playwright/manual smoke tests, peer-review triggers |
| `08-deepwiki-integration.md` | using saved DeepWiki context safely | evidence hierarchy, refresh cadence, anti-bloat rules |
| `11-tool-routing.md` | deciding MCP/tool order | local-first evidence policy |
| `12-cross-agent-handoffs.md` | handing work between agents | handoff contract and evidence expectations |
| `13-skill-activation-matrix.md` | deciding which skills to activate | active vs conditional vs parked skills |
| `14-agent-tool-conventions.md` | choosing MCPs, skills, and escalation paths | task-based tool order and fallbacks |
| `99-repo-inventory.md` | locating files quickly | compact path map |

## Operating rule

- Local code and config win over generated docs and external summaries.
- Use `sequential-thinking` first for non-trivial work.
- Use `09-validation-checklist.md` for default validation and peer-review triggers.
- Use `deepwiki` only after local reads.
- Use `context7` only for current upstream semantics that local code cannot answer.
