# Production Readiness Audit — House of Dreams

**Date:** March 20, 2026
**Deadline:** March 24, 2026 (4 days)
**Auditor:** Claude Code (Opus 4.6)

---

## Overall Score: 6.2 / 10

The application is architecturally sound with a clear state machine, staged loading, and spatial audio. The main gaps are: uncommitted work, 56 console.log statements, placeholder content, missing error boundaries, and no WebGL fallback. With focused effort over 4 days, this can ship.

---

## Dimension Scores

| # | Dimension | Score | Status |
|---|-----------|-------|--------|
| 1 | Build & Deploy | 7/10 | 🟡 |
| 2 | Complete User Flow | 7/10 | 🟡 |
| 3 | Audio System | 7/10 | 🟡 |
| 4 | 3D Scene & Performance | 6/10 | 🟡 |
| 5 | Mobile & Responsive | 6/10 | 🟡 |
| 6 | Content Completeness | 5/10 | 🟡 |
| 7 | Visual Polish | 7/10 | 🟡 |
| 8 | Error Handling | 5/10 | 🟡 |
| 9 | Accessibility | 5/10 | 🟡 |
| 10 | Browser Compatibility | 7/10 | 🟡 |

---

## Blockers (must fix before March 24)

| # | Issue | Effort | Dimension |
|---|-------|--------|-----------|
| 1 | **Review and commit all pending work** — 18 modified files + 7 untracked files including `landingContent.js`, `atmosphere.js`, landing page HTML/CSS. Nothing ships until this is committed. **Note:** `atmosphere.js` is untracked and wasn't part of any planned session — review whether it's intentional before committing. | 0.5h | Deploy |
| 2 | **Strip console.log from production builds** — 56 statements across 7 files. Use Vite's built-in esbuild drop config: `esbuild: { drop: ['console'] }` in `vite.config.js`. This strips all console.* calls from production builds while preserving them in dev server. **10 minutes, not 2h.** Keep logs available for debugging during the remaining 4 days. | 0.15h | Deploy |
| 3 | **Add WebGL detection and fallback message** — `initScene()` (line 99 of main.js) calls `new THREE.WebGLRenderer()` with no try/catch. If WebGL is unavailable, the page crashes silently. Add a try/catch around scene init, show a user-facing "WebGL required" message. | 1h | Error Handling |
| 4 | **Integrate client's landing page texts** — 2 of 4 panels are placeholder ("Placeholder for the client's text…"). The landing page is the first thing visitors see. These texts MUST be replaced before launch. *Depends on client delivery.* | 0.5h | Content |
| 5 | **Run `npm run build` and verify dist/** — Current dist/ has stale files (`index-DmheAO3H.css` deleted in git status). Build must be clean before deploy. | 0.25h | Deploy |

**Total blocker effort: ~2.4h** (plus client text delivery)

---

## Important (should fix before March 24)

| # | Issue | Effort | Dimension |
|---|-------|--------|-----------|
| 6 | **Wrap animate loop in try-catch** — Any uncaught error in `animate()` kills the entire experience with no recovery. Add a top-level try-catch that logs the error and continues rendering. | 0.5h | Error Handling |
| 7 | **Add null guard on `currentSpeedDisplay`** — Line ~1774 of main.js: `currentSpeedDisplay.textContent = ...` will throw if element is null (happens when debug panel is hidden). | 0.25h | Error Handling |
| 8 | **Replace `suppressPauseOnNextDesktopUnlock` flag with state check** — Race condition: if user presses ESC during the 0.42s inspect enter transition, the flag gets consumed incorrectly. Replace with: `if (inspectState.phase !== INSPECT_PHASE.IDLE) return;` in `handleDesktopUnlock()`. | 0.5h | User Flow |
| 9 | **Populate subtitle fallback text with letter metadata** — All 46 letters have empty `text` field. Current fallback is "Listening to Letter N…" which is functional but thin. Consider "Letter N • [date range from chronology]" for richer context. | 1h | Content |
| 10 | **Add user notification for deferred load failures** — If zone 3+ letters fail to load, only console shows it. Add a brief non-blocking toast or status message so the visitor knows the archive is degraded. | 1h | Error Handling |
| 11 | **Test on actual mobile device** — Touch controls, loading scene performance, pointer lock alternatives, inspect mode buttons need real-device validation. Cannot be fully validated from code reading alone. | 2h | Mobile |
| 12 | **Start screen content is minimal** — `startShellContent.js` has `project: '', howToUse: '', context: ''`. The start screen shows only title + "The archive is ready." Add: "Use WASD to move, mouse to look. Approach the papers to hear their stories." and a brief project context sentence. | 0.5h | Content |

**Total important effort: ~5.75h**

---

## Nice-to-have (if time allows)

| # | Issue | Effort | Dimension |
|---|-------|--------|-----------|
| 13 | **Code-split Three.js chunk** — Bundle warning: `three-DGD27VI7.js` is 562KB (over 500KB threshold). Dynamic import or splitting postprocessing into a separate chunk would improve initial load. | 2h | Performance |
| 14 | **Add loading skeleton or progress indicator for deferred letters** — Currently invisible to the user that zone 3+ letters are loading in the background. A subtle progress indicator would set expectations. | 1.5h | Polish |
| 15 | **Remove unreferenced assets** — `47.glb`, `47.jpg`, `47-47.jpg` exist but aren't used. 3 orphaned files. | 0.25h | Deploy |
| 16 | **Add reduced-motion handling for JS animations** — CSS `prefers-reduced-motion` covers landing/start animations, but dust particles, letter idle sway, and loading scene drone flight are JS-driven and unaffected. | 2h | Accessibility |
| 17 | **Add keyboard skip link on landing page** — No way to skip to CTA without Tab-cycling through 4 panels. | 0.5h | Accessibility |
| 18 | **Pointer Lock API existence check** — No guard for browsers that don't support Pointer Lock at all. Would affect very old browsers only. | 0.5h | Compat |
| 19 | **Clean up `.superpowers/`, `.playwright-cli/`, `.playwright-mcp/` from repo** — These appear to be tooling artifacts that shouldn't deploy. Add to `.gitignore`. | 0.25h | Deploy |
| 20 | **Optimize loading scene for mobile GPUs** — 2000 dust + 500 mist particles + 6 post-processing effects is heavy. Consider reducing particle count or disabling chromatic aberration on mobile. | 2h | Performance |

**Total nice-to-have effort: ~9h**

---

## Post-launch

| # | Issue | Notes |
|---|-------|-------|
| 21 | **Implement real theme mixer** — `themeMixer.js` is placeholder. Per-letter theme switching would enrich the atmosphere but isn't needed for launch (2 themes serve 46 letters). |
| 22 | **Add per-letter subtitle text** — The `text` field in letters.json is empty for all 46. When the client provides translations/transcriptions, populate these for subtitle display. |
| 23 | **Implement LOD system** — No level-of-detail. Distant letters render at full polygon count. Would improve performance for zone 4 (28 letters). |
| 24 | **Add service worker for offline detection** — Show a meaningful message instead of broken page when offline. |
| 25 | **Add error telemetry** — Track which devices/browsers hit failures, asset load times, deferred load success rates. |
| 26 | **Systematic Three.js resource disposal** — No explicit `.dispose()` calls for letter geometries/materials on cleanup. Long sessions could accumulate GPU memory. |
| 27 | **Remove or consolidate debug system** — Debug panel, speed slider, console.log positions, bird's eye view are development tools. Consider gating behind a production flag. |

---

## Detailed Findings Per Dimension

### 1. Build & Deploy Readiness — 7/10 🟡

**What works:**
- `npm run build` succeeds in 3.49s
- `npm run validate:letters` passes — all 46 letters validated, 15 unique narrations, 2 themes, 92 images
- All referenced asset paths in `letters.json` resolve to real files in `public/`
- Cloudflare `_headers` correctly sets CORS and MIME types for `.glb` and `.mp3`
- Cloudflare `_redirects` has SPA catch-all (`/* /index.html 200`)
- Vite config properly handles aliases, GLB includes, Three.js manual chunk

**What needs attention:**
- **56 console.log statements across 7 files** — these will appear in the production browser console
- **Three.js chunk is 562KB** (gzip: 145KB) — exceeds Vite's 500KB warning. Total JS: 826KB (gzip: 218KB). Acceptable for a Three.js app, but code-splitting would help.
- **189MB total dist/** — dominated by 46 GLB models + letter images + audio. Unavoidable for the content, but highlights the importance of deferred loading.
- **18 modified + 7 untracked files not committed** — includes critical new files (`landingContent.js`, `atmosphere.js`) and all session 1-4 changes
- **3 orphaned assets** — `47.glb`, `47.jpg`, `47-47.jpg` exist but aren't referenced
- **Tooling artifacts** — `.superpowers/`, `.playwright-cli/`, `.playwright-mcp/` are untracked and should be gitignored

### 2. Complete User Flow — 7/10 🟡

**Full flow trace (code-verified):**
```
LANDING → [CTA click] → LOADING → [assets + cinematic done] → START → [enter] → ACTIVE
  ↓                                                                      ↕
  Landing panels with                                                  PAUSED
  "Read More" expand                                                     ↑
                                                                    [ESC / pause btn]

ACTIVE → [E key / inspect btn] → INSPECT (entering → active → exiting) → ACTIVE
```

**What works:**
- State machine is clean: 5 UI states, 3 view modes, 4 inspect phases
- Every transition has explicit handlers with guard conditions
- Pointer lock fallback timer (1.8s) prevents stuck "Entering…" state
- Touch path bypasses pointer lock entirely (correct)
- Deferred loading fires after ACTIVE entry without blocking gameplay
- Inspect mode has smooth 0.42s camera lerp/slerp transitions
- Bird's eye view (B key) properly toggles with camera state save/restore
- Landing "Read More" buttons use CSS overflow detection with event delegation
- Loading timeout set to 10 minutes for slow connections (Lebanon use case)

**What needs attention:**
- **Race condition on `suppressPauseOnNextDesktopUnlock`** — When entering inspect mode, pointer lock is released and this flag prevents the pause handler from firing. If the user separately triggers an unlock during the 0.42s transition, the flag is consumed and the inspect animation completes into an ambiguous state.
- **No user-facing notification for deferred load failures** — If zone 3+ letters fail, only console shows it. The `document.body.dataset.deferredLetterLoadStatus` is set to `FAILED` but no visible UI reacts to it.
- **`currentSpeedDisplay` null guard missing** — Will throw when debug panel elements don't exist (non-debug mode). Low risk since it only fires during ACTIVE state and the debug elements exist in DOM even when hidden.

### 3. Audio System — 7/10 🟡

**What works:**
- **Spatial audio** — `computeNarrationVolume()` uses power-curve distance fade (near: 2 units, far: 10 units, exponent: 1.5). Clean formula with no per-frame allocations.
- **Proportional theme ducking** — `setNarrationVolume()` inversely scales background theme volume as narration fades with distance. Smart: theme swells back naturally as you walk away.
- **Narration lifecycle** — `activateNarration()` resumes paused narration for same letter, starts fresh for new letter. `deactivateNarration()` pauses (preserving playhead). `restartNarration()` seeks to 0 (inspect mode only).
- **Request token system** — `activeNarrationRequestToken` increments on each narration request, preventing stale async loads from playing the wrong letter's narration.
- **Global pause** — `isGloballyPaused` flag prevents `setNarrationVolume()` from auto-resuming during pause screen or tab hide. Set in `pause()`, cleared in `resume()`.
- **Lazy loading** — Narrations are `registerNarration()`-ed at boot but only loaded when activated via proximity.
- **Visibility handler** — Pauses all audio on tab hide, resumes only if `uiState === ACTIVE`.

**What needs attention:**
- **AudioContext failure not handled** — If `Howler.ctx.resume()` fails or AudioContext creation is denied, no fallback message shown. The experience works but is silent.
- **15 narrations shared across 46 letters** — Intentional for now, but means letters 16-46 reuse narrations 1-15. The mapping in `letters.json` is explicit, so this works correctly.
- **`themeMixer.js` is a stub** — `update()` only logs a crossfade intent. No audible effect. This is fine for launch since 2 themes play via `audioEngine.playBackgroundTheme()`.
- **Per-frame volume update uses `currentTargetState.activeId`** — Correctly uses the proximity manager's active ID rather than `audioEngine.currentNarrationLetterId`, preventing `deactivateNarration()` from being immediately overridden. This is well-designed.

### 4. 3D Scene & Performance — 6/10 🟡

**What works:**
- **Staged loading** — Core letters (zones 1-2, 6 letters) load before start screen. Deferred letters (zones 3-4, 40 letters) load in background after ACTIVE entry.
- **Frustum culling** — Default Three.js frustum culling active on letter meshes. String lines have `frustumCulled = false` (correct — they extend to y=50).
- **Animation radius** — Letter idle animation (rotation/sway/bob) only runs for letters within 15 world units. Good optimization.
- **Atmosphere system** — Zone-adaptive lighting/fog with pre-computed color targets and exponential damping. Zero per-frame allocations.
- **Dust particles** — 500 particles with simple sine drift. Additive blending, depth write off. Lightweight.
- **Post-processing** — Bloom + vignette only (no DOF, no SSAO). Reasonable for 60fps budget.
- **Retry logic** — GLB loading retries 3 times with 2s delay. Good for slow connections.

**What needs attention:**
- **46 GLB models total** — Even with deferred loading, 40 models loading in background during gameplay could cause frame drops on weaker devices. No loading priority queue.
- **No LOD** — All models render at full detail regardless of distance. Zone 4 has 28 letters; if visible from distance, that's 28 full-res models.
- **Loading scene is heavy** — 2000 dust + 500 mist particles, 6 post-processing effects (bloom, vignette, chromatic aberration, noise, tone mapping, render pass), 6+ lights including dynamic point lights and spotlight. On mobile GPUs this could stutter.
- **Shadow maps disabled** — Correct for performance, but noted.
- **Renderer quality** — Pixel ratio capped at 1.5 (immersive) and 2.0 (inspect). Good for balancing quality/performance.
- **No WebGL2 detection** — Three.js r181 defaults to WebGL2 but falls back to WebGL1. No explicit check.

### 5. Mobile & Responsive — 6/10 🟡

**What works:**
- **Touch detection** — `'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0`
- **Virtual joystick** — Left side movement with dead zone (0.15), radius clamping, analog values
- **Look area** — Right side camera rotation with sensitivity 0.003
- **Safe area CSS** — `env(safe-area-inset-*)` with `0px` fallbacks for all interactive elements
- **Responsive breakpoints** — 768px (tablet) and 480px (phone) with adjusted sizing
- **Landing page mobile layout** — Grid collapses to vertical flex with center panel first
- **Touch inspect buttons** — Full set of front/back/zoom/exit buttons
- **Mobile pause button** — Dedicated `#mobile-pause-btn` with safe area positioning
- **Deferred status indicator** — Touch-specific status text for background loading
- **viewport-fit: cover** — Proper notch handling

**What needs attention:**
- **Loading scene on mobile** — 2000 particles + complex post-processing untested on mobile GPUs. Could cause overheating or low framerate.
- **No hybrid device handling** — Devices with both touch and mouse (Surface, iPad with keyboard) get touch path. May not match user expectation.
- **Touch joystick created dynamically** — `TouchControls.createUI()` appends elements to body at construction time. Works, but elements exist in DOM even when hidden.
- **No haptic feedback** — Joystick and look area don't provide tactile response.
- **Real-device testing not done** — All mobile analysis is code-level. Must test on actual iOS Safari and Android Chrome before launch.

### 6. Content Completeness — 5/10 🟡

**What's present:**
- ✅ 46/46 GLB models in `public/assets/models/`
- ✅ 46/46 front images in `public/assets/letters/`
- ✅ 46/46 back images in `public/assets/letters/`
- ✅ 15/15 narration MP3s in `public/assets/audio/`
- ✅ 2/2 theme MP3s in `public/assets/audio/`
- ✅ 6/6 loading scene assets in `public/3d_sednaya/`
- ✅ Chronology data validated (4 groups, 46 letters, zones match)

**What's incomplete:**
- ⚠️ **`text` field empty for all 46 letters** — Subtitles show fallback: "Listening to Letter N…". This means visitors hear narration but see no transcribed text. For an archive of prison papers, the written words are the primary content. Impact: significant.
- ⚠️ **2 of 4 landing panels are placeholder** — "The Party" and "The Papers" contain: "Placeholder for the client's text about…". These are the first thing visitors see.
- ⚠️ **Start screen has no project/how-to/context content** — `startShellContent.js` has empty strings for all three optional blocks. The start screen shows only: "Archive Ready / House of Dreams / The archive is ready." — minimal for an audience encountering the experience for the first time.
- ⚠️ **No favicon or OG meta tags** — `index.html` has no `<link rel="icon">` or OpenGraph meta for social sharing. For a project about testimony and memory, social sharing previews matter.

### 7. Visual Polish & Atmosphere — 7/10 🟡

**What works:**
- **Dark cinematic mood** — Black background, fog, post-processing bloom/vignette create an intimate archival feel
- **Zone-adaptive atmosphere** — Colors shift from cool blue (zone 1) through green, amber, to warm red (zone 4). Smooth cross-zone blending.
- **Shell panel design** — Glassmorphism with radial gradient glow, blur backdrop, border accents. Consistent across landing, loading, start, and inspect screens.
- **Staggered reveal animations** — Landing panels and start screen elements fade in with timed delays. CSS-only, clean.
- **CTA breathing animation** — Subtle box-shadow pulse on "Enter the Archive" and "Enter Archive" buttons. Stops on hover.
- **Ground timeline** — Gold/amber spine connecting letters in chronological order. Anchor markers, label cards, focus state. Reveals on first proximity.
- **Inspect mode** — Full-panel scan viewer with zoom, side switching, rounded corners, dark viewing stage.
- **Letter preview** — Front/back thumbnails appear in bottom-right corner during proximity.

**What needs attention:**
- **Loading screen overlay text** — "The archive is resolving the route before entry" is poetic but unclear. "Entering the archive…" status text is better. Mixed messaging.
- **Empty subtitles** — When near a letter, the subtitle shows "Listening to Letter 1…" in a rounded chip. Functional but doesn't honor the source material — these are prison papers with written words.
- **Ground timeline not visible until first proximity** — `hasBeenRevealed` starts false. The visitor may walk past the timeline without noticing it.

### 8. Error Handling & Resilience — 5/10 🟡

**What works:**
- **GLB retry logic** — 3 retries with 2s delay per model
- **Loading timeout** — 10 minutes for slow connections, with user-facing error screen and reload button
- **Slow connection detection** — After 30s, shows "This is taking longer than expected" message
- **Deferred load states** — DEGRADED (partial success) and FAILED (complete failure) tracked
- **Pointer lock fallback** — 1.8s timeout prevents stuck "Entering…" state
- **Asset validation script** — `npm run validate:letters` catches missing/orphaned assets at build time

**What's missing:**
- ❌ **No WebGL fallback** — If WebGL is unavailable, `initScene()` throws and the page is blank. No error message.
- ❌ **No try-catch in animate loop** — Any error in `proximityManager.update()`, `groundTimeline.update()`, or `updateDust()` kills the entire animation loop with no recovery.
- ❌ **No user notification for silent failures** — Deferred load failures, audio failures, and timeline initialization failures only log to console.
- ⚠️ **`composer.render(delta)` unchecked** — If initScene() partially fails, the animate loop will crash.
- ⚠️ **No "offline" detection** — If the user loses connection mid-session, asset loads fail silently.

### 9. Accessibility — 5/10 🟡

**What works:**
- **ARIA live regions** — `aria-live="polite"` on start-status, pause-status, touch-deferred-status, subtitle-container, inspect-overlay
- **ARIA atomic** — `aria-atomic="true"` on subtitle-container and inspect-overlay
- **ARIA labels** — `aria-label="Pause"` on mobile pause button, `aria-label="Close inspection mode"` on header exit button
- **Role attributes** — `role="status"` on touch-deferred-status
- **Reduced motion CSS** — `@media (prefers-reduced-motion: reduce)` disables animations and forces immediate transitions for landing and start screens
- **Color contrast** — White text on dark backgrounds (good contrast ratio)
- **Font sizing** — Responsive clamp() values with reasonable minimums

**What's missing:**
- ⚠️ **No reduced-motion for JS animations** — Dust particles, letter sway/bob, loading scene drone flight, atmosphere color transitions are JS-driven and ignore reduced-motion preference
- ⚠️ **No keyboard skip links** — Landing page has 4 panels before the CTA. No way to jump to main content.
- ⚠️ **Limited screen reader experience** — The 3D scene is inherently inaccessible to screen readers. No text-only alternative is provided.
- ⚠️ **Inspect images lack descriptive alt text** — `<img alt="Letter scan">` is generic. Could use "Front scan of Letter N" with date context.
- ⚠️ **No focus management** — When entering inspect mode, focus doesn't move to the inspect panel. Keyboard users may be lost.

**Note:** This is a 3D art installation, not a transactional website. The accessibility bar should be reasonable for the medium, not WCAG AAA. The main concern is ensuring the landing page (the first and potentially only thing some visitors can read) is accessible.

### 10. Browser Compatibility — 7/10 🟡

**What works:**
- **Three.js r181** — Well-tested across Chrome, Firefox, Safari
- **Howler.js** — Handles AudioContext quirks across browsers, including iOS Safari autoplay restrictions
- **PointerLockControls** — Standard API with fallback timer
- **ES module support** — Vite handles transpilation for target browsers
- **`env(safe-area-inset-*)` with fallbacks** — Graceful degradation for non-notched devices
- **Draco CDN not used** — `getGLTFLoader()` called without `useDraco = true`. No external CDN dependency. Standard GLTF loading only.

**What needs attention:**
- ⚠️ **`text-wrap: balance`** — Used on `.landing-title`, `.landing-subtitle`, `.shell-lede`, `.loading-title`. Safari 18+, Chrome 114+, Firefox 121+. Older browsers ignore it — text wraps normally (acceptable degradation).
- ⚠️ **`backdrop-filter: blur()`** — Used on shell panels and landing panels. Not supported in older Firefox/Edge. Panels will appear without blur (acceptable — background is dark anyway).
- ⚠️ **`clamp()` CSS function** — Widely supported now (Chrome 79+, Firefox 75+, Safari 13.1+). Safe.
- ⚠️ **Pointer Lock API** — Not checked for existence. Very old browsers (IE11) would fail. Not a realistic concern for the target audience.
- ⚠️ **WebGLRenderer** — Three.js attempts WebGL2 first, falls back to WebGL1. No explicit error boundary.

---

## Recommended 4-Day Action Plan

### Day 1 (March 21) — Ship Blockers + Critical Fixes

**Morning (3h):**
1. Review `atmosphere.js` and other untracked files for scope creep (0.25h)
2. Add `esbuild: { drop: ['console'] }` to `vite.config.js` (0.15h)
3. Add WebGL detection with fallback message (1h)
4. Add try-catch wrapper around animate loop (0.5h)
5. Fix `currentSpeedDisplay` null guard (0.25h)
6. Fix `suppressPauseOnNextDesktopUnlock` race condition (0.5h)
7. Remove orphaned assets: `47.glb`, `47.jpg`, `47-47.jpg` (0.05h)

**Afternoon (3h):**
8. Add `.gitignore` entries for `.superpowers/`, `.playwright-cli/`, `.playwright-mcp/` (0.15h)
9. Commit all pending work (review diff carefully) (0.5h)
10. Clean build + verify dist/ (0.25h)
11. Deploy to Cloudflare Pages staging (0.5h)
12. Desktop smoke test: full flow LANDING → INSPECT → PAUSE → RESUME (1.5h)

### Day 2 (March 22) — Content + Mobile

**Morning (4h):**
1. Integrate client landing page texts when delivered (0.5h)
2. Add meaningful start screen content (how-to instructions, brief context) (0.5h)
3. Improve subtitle fallback: "Letter N • [date]" instead of "Listening to Letter N…" (1h)
4. Add user-facing toast for deferred load failures (1h)
5. Add favicon and basic OG meta tags (1h)

**Afternoon (3h):**
6. Real-device mobile testing — iOS Safari + Android Chrome (2h)
7. Fix any mobile issues found (1h)

### Day 3 (March 23) — Polish + Performance

**Morning (3h):**
1. Reduce loading scene particle count for mobile (1h)
2. Code-split Three.js chunk if time allows (2h)

**Afternoon (3h):**
3. Full cross-browser test: Chrome, Firefox, Safari desktop (1.5h)
4. Fix any issues found (1h)
5. Final staging deploy + smoke test (0.5h)

### Day 4 (March 24) — Launch

**Morning (2h):**
1. Final client text review if texts arrived late
2. Production deploy to Cloudflare Pages
3. Verify production URLs, assets, CORS headers
4. Quick smoke test on production

**Afternoon:**
5. Monitor for errors
6. Document post-launch issues for future sessions

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Client texts not delivered by March 24 | Medium | High — 2 panels say "Placeholder" | Have fallback: shorter text that says "Details forthcoming" |
| Mobile GPU overheating on loading scene | Medium | Medium — stuttery intro | Reduce particles, disable chromatic aberration on mobile |
| WebGL unavailable on visitor's device | Low | Critical — blank page | Add detection + fallback (blocker #3) |
| Slow connection causes timeout | Low | Medium — error screen shown | 10-minute timeout + retry logic already in place |
| Pointer lock denied by browser | Low | Medium — can't enter archive | Fallback timer + error message already in place |
| No subtitle text available for launch | High | High — "Listening to Letter N…" undermines the archive premise | Show chronology date + contextual line (e.g., "Letter 7 • 12/02/1991 – written from Saydnaya") instead of generic fallback |
| `atmosphere.js` is unplanned scope creep | Low | Low — may introduce bugs | Review before committing; remove if not integrated into main.js animate loop |
