# Renderer Rules

- Keep archive scene ownership in `src/renderer/sceneSetup.js` and intro scene ownership in `src/renderer/loadingScene.js`; do not merge those lifecycles casually.
- Keep camera motion and control state in `src/renderer/controls.js` and `src/interaction/touchControls.js`; renderer modules should not create parallel movement logic.
- Treat `src/main.js` as the orchestration layer that activates renderers and controls, not as a place to absorb renderer internals.
- Be cautious with lighting, fog, material, tone-mapping, and postprocessing changes. Visual regressions here can make letters unreadable or appear missing without obvious runtime errors.
- After renderer work, validate resize behavior, intro-to-archive handoff, and the affected desktop or mobile control path.
