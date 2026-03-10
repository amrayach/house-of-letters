# 08. DeepWiki Integration

Use this file to keep DeepWiki helpful without letting it outrank the checked-out repo.

## Canonical hierarchy

Evidence order for this repo:

1. local code and config
2. checked-in repo docs under `docs/agents/shared/`
3. DeepWiki distilled notes under `docs/agents/deepwiki/distilled/`
4. DeepWiki raw captures under `docs/agents/deepwiki/raw/`

DeepWiki is a second-opinion and context-enrichment layer only. It does not become canonical just because it is summarized neatly.

## What DeepWiki is for

- quick repo-shape reminders after local grounding
- spotting likely hot spots or stale assumptions worth checking
- saving a lightweight external summary that can be compared against code later
- reducing repeated repository re-summarization across sessions

## What DeepWiki is not for

- deciding who owns a behavior when code already answers it
- settling conflicts between docs and code
- replacing the local read of `src/main.js`, `vite.config.js`, `index.html`, or the owning subsystem files
- adding new "facts" to shared docs unless those facts were rechecked locally

## Storage layout

- fixed prompts: `docs/agents/prompts/deepwiki-questions.md`
- raw captures: `docs/agents/deepwiki/raw/`
- code-checked notes: `docs/agents/deepwiki/distilled/`

Keep raw and distilled separate:

- raw = saved DeepWiki output plus prompt metadata
- distilled = repo-grounded notes that call out what held up and what did not

## Refresh cadence

Refresh the DeepWiki layer:

- after material changes to architecture, runtime sequencing, data contracts, or build/deploy behavior
- before a multi-agent handoff if the saved extraction is visibly stale
- otherwise on a light hygiene cadence, roughly quarterly, only if the layer is still being used

Do not refresh it on every small change. The goal is useful context, not constant churn.

## Standard workflow

1. Read local code and the relevant shared docs first.
2. Run the fixed prompts from `docs/agents/prompts/deepwiki-questions.md`.
3. Save raw output into the stable files under `docs/agents/deepwiki/raw/`.
4. Compare each meaningful DeepWiki claim against code and canonical repo docs.
5. Update the distilled notes and mismatch ledger.
6. Update shared docs only when the correction is backed by local evidence.

## Avoiding context bloat

- Do not load every raw file by default. Start with the shared docs, then the distilled notes, then only the one raw file you actually need.
- Keep raw captures grouped by topic instead of saving many slightly different prompts.
- Keep distilled notes short and decision-oriented.
- Do not duplicate the same architecture summary across shared docs, distilled notes, and agent wrappers.
- Prefer the mismatch ledger over rewriting multiple docs to say the same thing.

## What never goes into root `AGENTS.md`

Do not put these in the repo-root `AGENTS.md`:

- raw DeepWiki output
- prompt catalogs or extraction transcripts
- volatile extraction dates or run logs
- mismatch ledgers
- repo-specific claims derived only from DeepWiki and not rechecked locally

`AGENTS.md` should stay stable, high-level, and policy-oriented. The DeepWiki layer belongs under `docs/agents/`.
