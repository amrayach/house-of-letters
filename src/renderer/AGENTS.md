# Renderer Local Guide

- This directory owns archive scene setup, lighting, desktop movement glue, letter-model loading/material prep, and the separate loading-scene renderer.
- Do not casually merge `loadingScene.js` into the archive renderer path or move camera/input ownership out of `controls.js`.
- In `letters.js`, keep retry logic, `userData` attachment, texture color-space handling, and material swaps deliberate. Changes here affect boot time, memory, and highlight behavior.
- Keep per-frame and per-model work lean. `letters.js` and `loadingScene.js` are the renderer-side hot paths.
- Local validation:
  - scene or controls work -> verify resize, pointer lock, and the affected movement path
  - intro work -> verify skip/completion handoff into the archive scene
  - loader or material work -> verify GLB requests succeed and letters stay visible/readable
- Relevant skills and MCPs: `threejs-fundamentals`, `threejs-loaders`, `threejs-interaction`, and `sequential-thinking`; use browser validation only after local code reads.
