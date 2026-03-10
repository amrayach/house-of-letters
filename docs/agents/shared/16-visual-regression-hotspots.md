# 16. Visual Regression Hotspots

Use this as the watchlist for shell-state and overlay regressions after UI edits.

## Hotspots

| State | Failure pattern | Why fragile | Primary trigger | Regression check |
| --- | --- | --- | --- | --- |
| loading screen | HUD/debug leaks under the overlay, or the new panel loses hierarchy/crops at narrow widths | renderer and overlay DOM mount before the loading handoff completes, and the panel now depends on responsive spacing | boot, slow loads, skip intro, narrow viewport reload | confirm only loading scene and loading overlay are visible before transition and that the loading panel remains centered/readable |
| start screen | reticle/controls/bird's-eye/touch HUD leak into the shell, or the entry panel collapses into a flat full-screen veil | shell visibility is split between HTML defaults, CSS, and runtime gating, and the shell now relies on a single focal panel | loading completion, resize, refresh on mobile | confirm start shell is visually exclusive on desktop/mobile and that the entry panel keeps clear title-copy-CTA hierarchy |
| pause screen | active HUD remains visible behind the pause shell | pause depends on different desktop and mobile control branches, but shell gating should now own all overlay visibility | desktop unlock, mobile pause tap, resume failure | confirm pause shell is exclusive and recoverable in both input modes |
| subtitle layer | subtitle obscures the focal scene or sits too close to preview cards | active-letter UI depends on runtime state plus responsive positioning | entering letter proximity on narrow screens | check subtitle spacing at desktop and mobile widths near the first letter cluster |
| letter preview | preview cards cover too much scene area or remain mounted when inactive | preview visibility combines shell gating, proximity, and CSS transitions | active-letter enter and exit, pause, resize | confirm preview is absent outside active immersive letter focus and returns cleanly on re-entry |
| bird's-eye mode | indicator collides with other overlays, or pause/resume returns in the wrong camera mode | bird's-eye is stateful but stylistically separate from the rest of the archive | `B` toggle, pause from bird's-eye, desktop debug mode | confirm indicator appears only while bird's-eye is active and that pause/resume returns to immersive mode |
| mobile controls | joystick, look area, or pause button show during loading, start, or pause | mobile visibility now depends on shell gating plus coarse-pointer CSS, so duplicated control-layer toggles would regress it | initial mobile load, pause/resume, viewport resize | confirm touch controls appear only in active mobile play |
| z-index and overlay stack | wrong shell appears on top, or hidden overlays still intercept behavior expectations | multiple full-screen shells coexist with an always-running scene renderer | fast transitions, intro skip, pointer-lock failures | test loading -> start -> active -> pause -> resume in sequence and verify single-shell ownership |
| pointer-lock interactions | start or pause shell disappears even though pointer lock failed | browser behavior is asynchronous and may fail silently or with delayed events | initial desktop entry, resume, browser denial | confirm failed pointer lock leaves a visible recovery shell with actionable copy |

## Priority checks

Run these after any shell, HUD, pointer-lock, or responsive overlay change:

1. Desktop loading -> start -> active -> unlock -> resume.
2. Desktop pointer-lock failure path.
3. Desktop bird's-eye entry, pause exit, and normal resume.
4. Mobile loading -> start -> active -> pause -> resume.
5. Mobile active-letter proximity with subtitle and preview visible.
6. Loading/start panel hierarchy at a narrow mobile width after resize or refresh.

## Current evidence set

The baseline walkthrough that informed this watchlist used local Playwright captures from the running app, including:

- `uiux-loading-screen.png`
- `uiux-start-screen.png`
- `uiux-bird-eye.png`
- `uiux-mobile-start-screen.png`
- `uiux-mobile-active.png`
- `uiux-mobile-pause-screen.png`
- `uiux-mobile-preview-subtitle.png`

The current loading/start composition pass also captured:

- `output/playwright/loading-after.png`
- `output/playwright/start-after-desktop.png`
- `output/playwright/start-after-mobile.png`
