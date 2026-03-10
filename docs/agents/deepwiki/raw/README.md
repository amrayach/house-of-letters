# DeepWiki Raw Captures

This directory stores saved DeepWiki output for `amrayach/house-of-letters`.

Raw capture rules:

- Raw files are a second-opinion archive, not canonical repo truth.
- Keep the DeepWiki answer close to the original output.
- Add only lightweight framing around the prompt, extraction date, repo name, and tool used.
- Do not silently rewrite raw captures to match the code. Any correction belongs in `../distilled/`.
- If DeepWiki is unavailable, keep the file headings and paste-in instructions, then stop there.

## Expected files

- `wiki-structure.md`
- `architecture-qa.md`
- `runtime-qa.md`
- `data-qa.md`
- `deploy-qa.md`

## If DeepWiki is unavailable

Create the expected files with:

- capture metadata
- the exact prompt that should be run
- a `Paste DeepWiki output here` heading
- a short note stating that extraction could not be performed in the current session

Do not invent extraction results.

## Current state

- Capture metadata belongs in the individual raw files, not in this README.
- The files in this directory are for saved DeepWiki output about `amrayach/house-of-letters`.
