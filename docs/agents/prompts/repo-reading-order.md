# Repo Reading Order

Use this order for fresh agent sessions. Stay local-first.

## Full reading order

1. `docs/agents/shared/11-tool-routing.md`
2. `docs/agents/shared/13-skill-activation-matrix.md`
3. `docs/agents/shared/00-project-overview.md`
4. `docs/agents/shared/99-repo-inventory.md`
5. `README.md`
6. `package.json`
7. `vite.config.js`
8. `index.html`
9. `src/main.js`
10. `src/config/constants.js`
11. `src/data/letters.json`
12. `src/styles/main.css`
13. touched subsystem files under `src/renderer/`, `src/audio/`, `src/interaction/`, and `src/utils/`
14. relevant `scripts/*` file if the task touches asset processing or data generation
15. `public/_headers` and `public/_redirects` if the task touches deployment or asset serving
16. generated docs under `docs/0-index.md` and `docs/1-overview.md` only after the source read

## Minimum read path for quick tasks

Read this minimum set before editing:

1. `docs/agents/shared/11-tool-routing.md`
2. `docs/agents/shared/00-project-overview.md`
3. `package.json`
4. `vite.config.js`
5. `src/main.js`
6. the exact file you plan to touch
7. `src/config/constants.js` or `src/data/letters.json` if the task affects runtime behavior or content

## Deep read path for architecture tasks

Read in this order:

1. `docs/agents/shared/11-tool-routing.md`
2. `docs/agents/shared/13-skill-activation-matrix.md`
3. `docs/agents/shared/00-project-overview.md`
4. `docs/agents/shared/99-repo-inventory.md`
5. `README.md`
6. `package.json`
7. `vite.config.js`
8. `index.html`
9. `src/main.js`
10. `src/styles/main.css`
11. `src/config/constants.js`
12. `src/data/letters.json`
13. `src/renderer/*`
14. `src/audio/*`
15. `src/interaction/*`
16. `src/utils/*`
17. `scripts/generate-letter-positions.cjs`
18. `scripts/compress-glb.js`
19. `public/_headers`
20. `public/_redirects`
21. DeepWiki or generated docs only after the local read

## Do-not-start-with-these noisy paths

- `public/3d_sednaya/*`
- `public/assets/models/*`
- `public/assets/audio/*`
- `public/assets/letters/*`
- `dist/*`
- `node_modules/*`
- `docs/0-index.md`, `docs/1-overview.md`, `docs/2-getting-started.md`, and `docs/2.1-installation-and-setup.md`
- `src/data/letters_backup.json`
- `claude-skills/*`

## Recommended tool use per read mode

### Quick task mode

- Use shell reads only: `rg`, `sed`, `find`, `git`
- Skip `deepwiki` unless local ownership is unclear after the minimum read
- Skip `context7` unless the task depends on current upstream library/platform behavior

### Architecture mode

- Start with `sequential-thinking`
- Read local files in the order above
- Use `deepwiki` after local reading as a repo-level comparison only
- Use `context7` only for current official docs on `Vite`, `Three.js`, `Howler`, `Cloudflare Pages`, or AGENTS-style patterns

### Validation mode

- Follow `docs/agents/shared/09-validation-checklist.md`
- Use `playwright`, `responsiveness-check`, or `ux-audit` only after code changes or when explicitly testing UX
- Do not use validation tools as a substitute for reading `src/main.js` and the touched subsystem files
