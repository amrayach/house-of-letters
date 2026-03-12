# 18. Agent Task Template

Use this as a general abstract template for launching a focused agent task in this repo or adapting the same workflow to another repo. Replace the bracketed fields before use.

## Template

You are working in this repository.

Goal:
[State the exact task outcome in one sentence.]

Task type:
[Choose one: tiny fix / focused workstream / planning pass / review pass / consolidation pass / validation pass]

Context:
- Current project state: [brief summary]
- Relevant prior work: [commits / sessions / finished workstreams]
- Why this task matters now: [reason]
- This task is part of: [PLANS.md section / workstream name]

Constraints:
- Do not widen scope beyond: [scope boundary]
- Preserve: [architecture / UX flow / ownership boundaries / deployment behavior]
- Do not modify: [files, systems, or behaviors that must remain untouched]
- Prefer: [smallest correct change / architecture-preserving edits / docs-first / validation-first]
- Update docs when: [behavior / plan / validation expectations change]

Required reading:
- AGENTS.md
- PLANS.md
- [relevant docs/agents/shared/*.md files]
- [relevant source files]
- [relevant config/build/deploy files]

Tool usage:
- sequential-thinking: [mandatory / optional / do not use]
- context7: [when to use]
- deepwiki: [when to use]
- playwright + playwright-cli: [when to use]
- figma: [when to use]
- [other tools or MCPs]: [conditions]

Skills to use if available:
- [skill 1]
- [skill 2]
- [skill 3]

Do not use unless clearly needed:
- [irrelevant skills / MCPs / tools]

Tasks:
1. Restate the exact problem in repository terms.
2. Define success criteria before editing.
3. Identify the minimum set of files to inspect.
4. Identify the minimum set of files to change.
5. Implement the smallest correct solution.
6. Validate the result using the appropriate checks.
7. Update docs and planning artifacts if the repository truth changed.
8. Report what changed, what was validated, and what remains open.

Validation:
- [validator command]
- [build command]
- [test command]
- [Playwright smoke checks]
- [manual checks]
- Confirm no regressions in: [specific states / flows / screens / interactions]

Update these files if needed:
- PLANS.md
- docs/agents/shared/[relevant doc].md
- docs/agents/shared/09-validation-checklist.md
- docs/agents/shared/06-open-questions.md
- [other docs]

Output requirements:
- Problem summary
- Success criteria
- Files inspected
- Files changed
- What was intentionally not changed
- Validation results
- Risks / follow-ups
- Recommended next narrow task

Important:
- Read local code before relying on summaries.
- Do not invent refactors when smaller changes are sufficient.
- If the task is larger or riskier than expected, stop after producing a corrected sub-plan instead of half-implementing it.
