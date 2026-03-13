# 16. Visual Regression Hotspots

Use this as the watchlist for shell-state and overlay regressions after UI edits.

## Hotspots

| State | Failure pattern | Why fragile | Primary trigger | Regression check |
| --- | --- | --- | --- | --- |
| loading screen | HUD/debug leaks under the overlay, or the new panel loses hierarchy/crops at narrow widths | renderer and overlay DOM mount before the loading handoff completes, and the panel now depends on responsive spacing | boot, slow loads, skip intro, narrow viewport reload | confirm only loading scene and loading overlay are visible before transition and that the loading panel remains centered/readable |
| start screen | reticle/controls/bird's-eye/touch HUD leak into the shell, or the entry panel collapses into a flat full-screen veil | shell visibility is split between HTML defaults, CSS, and runtime gating, and the shell now relies on a single focal panel | loading completion, resize, refresh on mobile | confirm start shell is visually exclusive on desktop/mobile and that the entry panel keeps clear title-copy-CTA hierarchy |
| pause screen | active HUD remains visible behind the pause shell | pause depends on different desktop and mobile control branches, but shell gating should now own all overlay visibility | desktop unlock, mobile pause tap, resume failure | confirm pause shell is exclusive and recoverable in both input modes |
| touch deferred status | the pill overlaps the pause button or browser safe areas, or leaks into pause/start/inspect | it is intentionally minimal and shell-owned, so placement and visibility both depend on narrow CSS plus `syncUiChrome()` gating | degraded deferred session on touch, pause/resume, inspect enter/exit, narrow viewport | confirm the pill appears only in active immersive touch degraded sessions and clears the pause button and browser chrome |
| subtitle layer | subtitle obscures the focal scene or sits too close to preview cards | active-letter UI depends on runtime state plus responsive positioning | entering letter proximity on narrow screens | check subtitle spacing at desktop and mobile widths near the first letter cluster |
| letter preview | preview cards cover too much scene area or remain mounted when inactive | preview visibility combines shell gating, proximity, and CSS transitions | active-letter enter and exit, pause, resize | confirm preview is absent outside active immersive letter focus and returns cleanly on re-entry |
| ground chronology thread | the floor network reveals before full coverage, never reveals after deferred coverage completes, leaks into hidden states, or turns zone 4 into a label carpet | it depends on validated grouped chronology data, integrated letter coverage across startup and deferred stages, active shell state, movement speed, and proximity promotion all at once | first target reveal, deferred settle, free-walk movement, later-zone proximity, pause/resume, inspect, bird's-eye | confirm the thread first reveals only after full required coverage exists, stays ambient while moving, promotes only one readable label at a time, hides in bird's-eye, and stays absent when coverage remains incomplete |
| inspect prompt | prompt leaks into pause/bird's-eye/inspect, or advertises the wrong side | prompt visibility depends on candidate targeting plus shell/view state | approach letter, rotate away, enter inspect, pause | confirm the prompt appears only for a live immersive candidate and that its front/back copy matches the candidate side |
| inspect overlay | overlay leaves immersive HUD visible, side/zoom controls desync, or exit restores the wrong pose | inspect couples camera interpolation, input suppression, side metadata, and responsive CSS | enter inspect, switch side, zoom, exit, pause/unlock | confirm the overlay is exclusive, controls gate correctly, and exit or forced exit returns cleanly to immersive play |
| bird's-eye mode | indicator collides with other overlays, or pause/resume returns in the wrong camera mode | bird's-eye is stateful but stylistically separate from the rest of the archive | `B` toggle, pause from bird's-eye, desktop debug mode | confirm indicator appears only while bird's-eye is active and that pause/resume returns to immersive mode |
| mobile controls | joystick, look area, or pause button show during loading, start, or pause | mobile visibility now depends on shell gating plus coarse-pointer CSS, so duplicated control-layer toggles would regress it | initial mobile load, pause/resume, viewport resize | confirm touch controls appear only in active mobile play |
| z-index and overlay stack | wrong shell appears on top, or hidden overlays still intercept behavior expectations | multiple full-screen shells coexist with an always-running scene renderer | fast transitions, intro skip, pointer-lock failures | test loading -> start -> active -> pause -> resume in sequence and verify single-shell ownership |
| pointer-lock interactions | start or pause shell disappears even though pointer lock failed | browser behavior is asynchronous and may fail silently or with delayed events | initial desktop entry, resume, browser denial | confirm failed pointer lock leaves a visible recovery shell with actionable copy |

## Priority checks

Run these after any shell, HUD, pointer-lock, or responsive overlay change:

1. Desktop loading -> start -> active -> unlock -> resume.
2. Desktop pointer-lock failure path.
3. Desktop active -> candidate -> inspect -> exit -> unlock -> resume.
4. Desktop bird's-eye entry, pause exit, and normal resume.
5. Desktop active degraded session -> confirm controls-hint appends deferred status without breaking the hint baseline.
6. Desktop active -> first chronology reveal near Letter 1 -> move -> slow near a later-zone letter -> inspect -> exit -> bird's-eye hide.
7. Mobile loading -> start -> active -> touch inspect -> exit -> pause -> resume.
8. Mobile degraded deferred session -> pill visible -> pause -> resume -> inspect -> exit.
9. Mobile active-letter proximity with subtitle and preview visible.
10. Loading/start panel hierarchy at a narrow mobile width after resize or refresh.

## Current evidence set

No screenshot or log artifacts are currently checked into the repo for this watchlist.

Earlier plan revisions referenced local `uiux-*` captures and `output/playwright/*` images, but those files are not present in the checked-out repo today.

Use this document as the checklist for fresh evidence capture. When a new smoke pass is run, either store the artifacts in-repo intentionally or summarize the exact run and outcome in docs/checkpoint notes instead of citing missing files.

Manual-only gap to keep stating honestly:

- Real-device iOS Safari and Android Chrome degraded-session evidence for the touch deferred-status pill is still required before treating that placement as fully proved.
