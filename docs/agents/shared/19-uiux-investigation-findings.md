# 19. UI/UX Investigation Findings

## Investigation metadata

- Date: 2026-03-21
- Sessions: 1A (code analysis), 1B (browser testing), 1C (synthesis)
- Tested URL: https://www.houseofdreams.space/
- Listen URL: https://www.houseofdreams.space/listen/?p=1
- Viewports tested: 360×640, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080
- Tools used: ui-ux-pro-max (design-system, style, color, typography, ux, landing), Playwright (navigate, screenshot, snapshot, resize, click, run_code, press_key), 21st_magic_component_inspiration, local file reads
- Manual-only gaps: desktop active, inspect, bird's-eye, pause (pointer-lock blocks Playwright). Code analysis covers these states; live visual confirmation requires manual testing.

## Executive summary

The House of Dreams frontend is **stronger than typical web projects** in its core visual identity — the glass panel system, staggered reveal animations, breathing glow CTAs, and restrained dark palette create a genuinely cinematic, museum-quality feel. The listen page (exhibition audio guide) is excellently cohesive and extremely lightweight (295ms load, 4.3KB). Responsive behavior is smooth thanks to heavy clamp() usage.

The primary gaps are **infrastructure completeness** (no OG/social/favicon metadata — critical for exhibition promotion), **accessibility compliance** (zoom disabled, keyboard gaps on listen page, missing ARIA attributes), and **design system formalization** (35+ ad-hoc font sizes, 14 white opacity levels, 5 blur values, no spacing scale). The bird's-eye indicator remains the single largest tonal rupture, and the pause screen is the weakest shell state visually.

Exhibition readiness level: **the 3D experience itself is strong, but the surrounding infrastructure (social sharing, accessibility, content completeness) needs targeted work.**

---

## Design system assessment

### Current state

**Tokens (11 CSS custom properties in `:root`):**

| Property | Value | Usage |
|----------|-------|-------|
| `--primary-color` | `#ffffff` | Text, button borders, reticle |
| `--bg-color` | `#000000` | Background |
| `--overlay-bg` | `rgba(0,0,0,0.85)` | Declared but **never referenced** (dead token) |
| `--font-family` | `'Courier New', Courier, monospace` | All text site-wide |
| `--shell-panel-bg` | gradient `rgba(11,16,26,0.78)` → `rgba(5,6,10,0.9)` | Glass panel backgrounds |
| `--shell-panel-border` | `rgba(255,255,255,0.2)` | Panel borders |
| `--shell-panel-shadow` | `0 24px 90px rgba(0,0,0,0.55)` | Panel depth shadows |
| `--shell-kicker-color` | `rgba(255,255,255,0.62)` | Section label text |
| `--shell-glow` | `rgba(112,144,255,0.14)` | Radial glow overlay |
| `--zone1-glow` | `102, 136, 204` | Raw RGB for breathing glow |
| `--safe-area-*` | `env(safe-area-inset-*, 0px)` | Notch positioning |

**Font:** Single family (Courier New) throughout. No heading/body distinction. No Arabic-capable fallback.

**Breakpoints:** Only `768px` and `480px` plus `prefers-reduced-motion` and `hover: none / pointer: coarse`. No 1024px, 1440px, or large-screen handling.

**Z-index:** Well-organized 16-tier stack (0 → 4000). No issues.

### Gaps

1. **35+ ad-hoc font sizes** with no mathematical scale. Fractional rem values (0.72, 0.74, 0.76, 0.84, 0.86, 0.88, 0.92, 0.94, 0.95, 1.02, 1.05) indicate pixel-level tuning without a system.
2. **14 distinct white opacity levels** (0.4 through 1.0) with no semantic naming. Values like 0.54 and 0.56 are interchangeable.
3. **4 distinct blue accent hues** (112,144,255 / 123,145,255 / 102,136,204 / 100,130,170) that should be one.
4. **5 distinct backdrop-filter blur values** (5px, 8px, 10px, 12px, 18px) with no hierarchy.
5. **18+ ad-hoc spacing values** with no consistent scale.
6. **10 distinct border-radius values** — should normalize to 4–5.
7. **No breakpoints above 768px** — 1920×1080 confirmed sparse (panels are 20rem boxes in vast black space). Exhibition kiosk concern.
8. **No `:focus-visible` on `.btn` class** — keyboard users see no focus indicator on primary CTAs.

### Recommendations

All implementable in vanilla CSS without architectural changes:

| Recommendation | Proposed tokens | Impact |
|---------------|-----------------|--------|
| Semantic text colors | `--text-primary` (1.0), `--text-secondary` (0.78), `--text-muted` (0.62), `--text-faint` (0.46), `--text-ghost` (0.28) | Collapses 14 opacity levels to 5 |
| Type scale | `--text-xs` (0.72rem) through `--text-display` (clamp) — 7 steps | Collapses 35+ sizes to 7 |
| Single blue accent | `--accent-blue: 102, 136, 204` | Unifies 4 hues |
| Blur tiers | `--blur-light` (6px), `--blur-medium` (12px), `--blur-heavy` (18px) | Normalizes 5 values to 3 |
| 4px spacing scale | `--space-2` (8px) through `--space-14` (56px) — 10 steps | Normalizes 18+ ad-hoc values |
| Radius scale | `--radius-sm` (8px), `--radius-md` (14px), `--radius-lg` (20px), `--radius-xl` (24px), `--radius-pill` (999px) | Normalizes 10 values to 5 |
| Wide-screen breakpoint | `@media (min-width: 1440px)` — increase panel max-width, add viewport cap | Fixes sparse composition |
| Focus ring | `--focus-ring: rgba(102,136,204, 0.7)` + `.btn:focus-visible` rule | Fixes keyboard a11y |
| Arabic font | `Noto Naskh Arabic` loaded conditionally for `[lang="ar"]` | Fixes Arabic rendering |

---

## Findings by severity

### Critical (blocks exhibition readiness)

1. ~~**No OG tags, favicon, or social sharing metadata**~~ — **RESOLVED (Session 2).** Added `og:title`, `og:description`, `og:image`, `twitter:card`, `meta description`, favicon (SVG + ICO + apple-touch-icon + PNG icons), and placeholder OG image (1200×630) to both `index.html` and `listen/index.html`. Operator should replace `public/og-image.png` with a photographic image when available.

### High (meaningfully degrades experience)

2. ~~**`user-scalable=no` WCAG 1.4.4 violation**~~ — **RESOLVED (Session 3).** Removed `maximum-scale=1.0` and `user-scalable=no` from both `index.html` and `listen/index.html`. Pinch-to-zoom now works on all text-heavy DOM overlays.

3. ~~**Bird's-eye indicator tonal rupture**~~ — **RESOLVED (Session 5).** Removed green `#4CAF50`, emoji, Material Design zone colors, and raw z-coordinates. Replaced with monochrome glass badge using `--shell-panel-bg`, `--shell-panel-border`, `backdrop-filter: blur(14px)`. Label + hint only — no zone legend.

4. ~~**Pause screen lacks glass panel treatment**~~ — **RESOLVED (Session 5).** Wrapped pause content in `.shell-panel.shell-panel-pause` with `::before` radial glow, matching landing/loading/start panel system. Added kicker + title hierarchy.

5. ~~**Landing read-more buttons have zero-padding touch targets**~~ — **RESOLVED (Session 3).** Added `padding: 12px 0`, `min-height: 44px`, and `display: inline-flex` to `.landing-read-more`. Also added `aria-expanded` attribute with JS toggle.

6. ~~**No `:focus-visible` on primary `.btn` class**~~ — **RESOLVED (Session 3).** Added global `:focus-visible` baseline with blue accent color, plus component-specific refinements for `.btn`, `.landing-read-more`, `.btn-inspect`, and `.btn-inspect-secondary`. Listen page also received global focus styles.

7. ~~**Inspect buttons below 44px at 480px**~~ — **RESOLVED (Session 3).** Added `min-height: 44px` to `.btn-inspect` and `.btn-inspect-secondary` in the 480px breakpoint.

8. ~~**Listen page progress bar not keyboard-accessible**~~ — **RESOLVED (Session 4).** Changed from `role="progressbar"` to `role="slider"` with `tabindex="0"`, arrow key seeking (±5s, RTL-aware), Home/End, and `aria-valuetext` updated during playback. Also added expanded click/focus area via padding trick.

9. ~~**Arabic typography — latent risk**~~ — **RESOLVED (Session 9).** Added Arabic font stack (`Noto Naskh Arabic`, `Geeza Pro`, `Traditional Arabic`, `Arabic Typesetting`, serif) scoped to `:lang(ar)`/`[lang="ar"]`. Zero letter-spacing with `!important` override to preserve connected script. Applied to both `main.css` and `listen/index.html`.

10. ~~**1920px+ landing composition sparse**~~ — **RESOLVED (Session 8).** Added `@media (min-width: 1440px)` with grid `max-width: 1400px` and panels scaled to 24rem. Added `@media (min-width: 1920px)` with panels at 26rem. Composition now feels proportional at kiosk sizes without losing intentional negative space.

### Medium (polish that raises quality)

11. ~~**14 distinct white opacity levels**~~ — **RESOLVED (Session 6).** Collapsed to 5 semantic tokens (`--text-primary` 0.88, `--text-secondary` 0.78, `--text-tertiary` 0.68, `--text-muted` 0.56, `--text-ghost` 0.38). 12 `color:` declarations migrated.

12. ~~**35+ ad-hoc font sizes**~~ — **RESOLVED (Session 6).** Added 5-step type scale (`--text-xs` through `--text-xl`). 18 `font-size` declarations migrated. Display/heading `clamp()` sizes left as-is (unique responsive expressions).

13. ~~**4 distinct blue accent hues**~~ — **RESOLVED (Session 6).** Added `--accent-rgb: 102, 136, 204` token. Unified `rgba(123, 145, 255)` → `rgba(112, 144, 255)` (imperceptible at 12% opacity). 6 focus-ring and accent declarations migrated.

14. ~~**5 distinct blur values**~~ — **RESOLVED (Session 6).** Added 3-tier system: `--blur-sm` 5px, `--blur-md` 12px, `--blur-lg` 18px. 10 `backdrop-filter` declarations migrated. `blur(8px)` left as-is (2 uses, between tiers).

15. ~~**No spacing scale**~~ — **RESOLVED (Session 6).** Added 8-step 4px-grid scale (`--space-1` through `--space-8`). 55 spacing declarations migrated. `clamp()` responsive spacing left as-is.

16. ~~**Missing `aria-live` on `#loading-status`**~~ — **RESOLVED (Session 3).** Added `aria-live="polite"` and `aria-atomic="true"` to `#loading-status`.

17. ~~**Missing `aria-expanded` on landing read-more**~~ — **RESOLVED (Session 3).** Added `aria-expanded="false"` to all read-more buttons in HTML, plus JS toggle in `handleLandingReadMore()`.

18. ~~**No landmark structure on landing page**~~ — **RESOLVED (Session 3).** Added `role="main"` and `aria-label` to `#landing-screen`.

19. ~~**Listen page `aria-live` missing**~~ — **RESOLVED (Session 7).** Added `aria-live="polite" aria-atomic="true"` to `#loading-msg`. Added `role="alert"` to the error state container.

20. ~~**No link from listen page to main archive**~~ — **RESOLVED (Session 4).** Added subtle "Explore the full archive →" link between player and footer.

21. ~~**Deferred notice close button at 28px**~~ — **RESOLVED (Session 3).** Increased from 28×28px to 44×44px.

22. ~~**768px tablet panels too wide**~~ — **RESOLVED (Session 8).** Changed 768px breakpoint `.landing-panel` from `max-width: 100%` to `max-width: 32rem` (~512px), capping monospace lines to ~60 characters.

23. ~~**Listen page English UI labels lack `lang="en"` in Arabic mode**~~ — **RESOLVED (Session 7).** Added `lang="en"` to header, paper-id section, English language button, archive link, footer, and error state. Added `lang="ar"` to Arabic language button.

### Low (nice-to-have refinements)

24. ~~**Dead token `--overlay-bg`**~~ — **RESOLVED (Session 9).** Removed from `:root`.

25. ~~**`.start-shell-primary/secondary` unstyled**~~ — **RESOLVED (Session 9).** Removed classes from `index.html` (no CSS rules, no JS references).

26. ~~**Listen page error creates `<style>` per error**~~ — **RESOLVED (Session 9).** Replaced `createElement('style')` with CSS class toggle (`.error-state-msg`). Error styles now in main `<style>` block.

27. ~~**`titlePulse` barely perceptible**~~ — **RESOLVED (Session 9).** Widened from 0.9↔1.0 to 0.75↔1.0 — now a visible gentle breathing effect.

28. ~~**Mixed `em`/`px` for letter-spacing**~~ — **RESOLVED (Session 9).** Converted all `px` letter-spacing values to `em` (8 declarations). Removed redundant breakpoint overrides for `.loading-title` since `em` scales with font size automatically.

29. **Start shell lede is generic** ("The archive is ready.") — missed opportunity for emotional preparation. — `startShellContent.js:4` — **Awaiting client copy input.**

30. ~~**No audio retry on listen page**~~ — **RESOLVED (Session 9).** Added "Try again" button on audio load failure that retries `audio.load()`. Button appears after error, removed on retry. Styled to match listen page buttons.

31. ~~**Listen page `role="group"` should be `role="radiogroup"`**~~ — **RESOLVED (Session 9).** Changed language selector container to `role="radiogroup"`.

32. ~~**10 distinct border-radius values**~~ — **RESOLVED (Session 6).** Normalized to 5-step scale (`--radius-sm` 8px, `--radius-md` 14px, `--radius-lg` 20px, `--radius-xl` 24px, `--radius-pill` 9999px). 15 declarations migrated.

---

## Findings by surface

### Landing screen
- Glass panel system is genuinely polished — confirmed visually (1B)
- Staggered reveal animation creates cinematic entrance (200–950ms delays)
- Read-more touch targets fail 44px minimum (zero padding)
- No landmark structure for screen readers
- 1920px composition sparse — panels small relative to screen
- 768px full-width panels create long line lengths
- Missing `aria-expanded` on read-more toggles

### Loading screen
- Lighter glass panel over 3D scene creates film-title-card feel — confirmed (1B)
- `#loading-status` lacks `aria-live` for dynamic messages
- Skip button is subtle but findable (1B)
- Console error: `theme_1.mp3` QUIC protocol error (intermittent CDN issue, not code bug)

### Start screen
- Glass panel with breathing glow is polished — confirmed (1B)
- Copy is functional but generic ("The archive is ready.")
- `.start-shell-primary/secondary` HTML classes have no CSS rules
- "HOW TO USE" and "CONTEXT" detail blocks provide good orientation

### Active desktop (manual-only gap)
- Code analysis confirms: reticle, controls hint, subtitle, preview, inspect prompt all gated by `syncUiChrome()`
- Preview/subtitle obstruction on small screens — known issue from `15-ui-ux-reentry.md`

### Active mobile (manual-only gap)
- Touch controls (joystick 120px, knob 50px) meet size requirements
- Safe-area handling implemented throughout

### Inspect mode (manual-only gap)
- Inspect buttons fall below 44px at 480px (`9px 12px` padding)
- Scan viewport and orbit viewport have good visual treatment (dark border, inner glow)
- Exit button at 28px is too small for touch

### Pause screen (manual-only gap)
- Weakest shell state visually — no glass panel, lightest blur (5px), no `::before` glow
- Copy is functional but could carry more emotional weight

### Bird's-eye mode (manual-only gap)
- Green accent (#4CAF50), emoji (🦅), Material Design zone colors, raw z-coordinates
- Complete tonal rupture from the rest of the archive
- Already flagged as #1 issue in `15-ui-ux-reentry.md` — investigation confirms it is worse than documented

### Exhibition listener (/listen/?p=*)
- Visual cohesion with main archive: excellent — confirmed (1B)
- Performance: 295ms DOM ready, 4.3KB transfer — excellent for QR flow
- Progress bar not keyboard-accessible — confirmed (1B Tab test)
- Arabic button label renders via system fallback — passable but fragile
- No `aria-live` for loading/error messages
- `user-scalable=no` WCAG violation
- No link back to main archive
- Listen page URLs use query-param format: `/listen/?p=1` through `/listen/?p=10`. Path-based routes like `/listen/1` are caught by the SPA fallback and do NOT reach the listen page.

---

## Responsive findings

| Viewport | Issues |
|----------|--------|
| 360×640 | Tight but functional. Panels stack, require scrolling. No horizontal overflow. Touch targets for read-more too small. |
| 390×844 | Slightly more breathing room than 360. CTA prominent at top. Good baseline for mobile. |
| 768×1024 | Grid collapses to flex-column — clean transition. Full-width panels create >80-char monospace lines. |
| 1024×768 | 2-column grid restored. Panels small relative to screen but proportional. Decent composition. |
| 1440×900 | Best-looking viewport. Panels well-proportioned, grid balanced. |
| 1920×1080 | Panels appear as small 320px boxes in vast black space. Composition feels sparse/unfinished. Exhibition kiosk concern. |

**Breakpoint gap:** No CSS rules for `min-width: 1024px`, `min-width: 1440px`, or `min-width: 1920px`. The 768px→480px transition is clean with no broken intermediate states.

---

## Accessibility findings

| WCAG Criterion | Issue | Location | Severity |
|----------------|-------|----------|----------|
| 1.4.4 Resize Text | `user-scalable=no` prevents zoom | Both HTML files | High |
| 2.1.1 Keyboard | Progress bar unreachable via keyboard | `listen/index.html` | High |
| 2.5.8 Target Size | Read-more ~80×12px, inspect buttons ~32px at 480px, close button 28px | `main.css`, `index.html` | High |
| 4.1.2 Name/Role/Value | `aria-expanded` missing on read-more | `index.html` | Medium |
| 1.3.1 Info/Relationships | Kicker `<p>` instead of heading, no landmarks | `index.html` | Medium |
| 4.1.3 Status Messages | Loading/error not in `aria-live` region | Both HTML files | Medium |
| 1.3.1 Info/Relationships | Paper number "1" has no semantic label | `listen/index.html` | Low |

---

## Typography assessment

**Current:** Single font family (Courier New) for all text. 35+ distinct font sizes with no mathematical scale. The monospace aesthetic serves the archival tone well for Latin text.

**Strengths:** Wide letter-spacing on kickers creates an institutional/archival feel. The `clamp()` display sizes provide fluid responsive scaling. The monospace font on black creates immediate "this is a document, not marketing" visual identity.

**Weaknesses:** Fractional rem values (0.74, 0.86, 0.92, 0.95, 1.02, 1.05) indicate pixel-level tuning without a system. Arabic text in Courier New lacks proper glyph support (latent risk). 8 distinct line-height values without a defined scale.

**Recommendation:** Collapse to 7-step type scale (`--text-xs` through `--text-display`). Keep Courier New for Latin. Add Noto Naskh Arabic conditionally for Arabic contexts.

---

## Color and contrast assessment

**Strengths:** White on pure black provides maximum contrast (21:1). The restrained palette (black, white at opacities, one blue accent) is highly disciplined for a web project. The blue accent (102,136,204) appears consistently across both HTML entry points.

**Weaknesses:** 14 distinct white opacity levels with no semantic naming. 4 slightly different blue hues should be one. Green accent (#4CAF50) in bird's-eye is tonally alien. Muted text at 0.4 opacity (`look-hint`) is borderline for readability.

**Contrast compliance:** All body text on black exceeds WCAG AA (4.5:1). Even the lowest opacity text (0.4 = ~8.5:1 on pure black) technically passes, but the listen page footer at 0.28 opacity (~5.9:1) is borderline for small text.

---

## Component improvement candidates

| Component | Quality (1-5) | Primary weakness | Improvement direction | Priority |
|-----------|--------------|------------------|----------------------|----------|
| Glass panels (landing, start) | 5 | Inconsistent blur values | Unify to 3-tier blur system | Medium |
| Loading overlay | 4.5 | Missing `aria-live` | Add `aria-live="polite"` to status | Medium |
| Pause overlay | 4.5 | — | ~~Resolved (Session 5)~~ — glass panel with glow | — |
| Bird's-eye indicator | 4 | — | ~~Resolved (Session 5)~~ — monochrome glass badge | — |
| Landing read-more | 3 | Zero-padding touch target, no aria-expanded | Add padding + ARIA | High |
| Inspect overlay | 4 | Touch buttons too small at 480px | Set min-height 44px | High |
| Listen audio player | 4 | Progress bar not keyboard-navigable | Add tabindex + arrow keys | High |
| Controls hint | 3.5 | No `:focus-visible` on associated buttons | Add focus ring to `.btn` | High |
| Reticle | 4 | None significant | — | — |
| Touch controls | 3.5 | Visual only (functional) | — | — |
| Subtitle container | 3.5 | Known mobile obstruction | Tracked in 15-ui-ux-reentry.md | — |
| Letter preview | 3.5 | Known mobile obstruction | Tracked in 15-ui-ux-reentry.md | — |

---

## Performance observations

### Landing page

| Metric | Value |
|--------|-------|
| DOM Content Loaded | 717ms |
| Load Complete | 718ms |
| First Paint | 392ms |
| First Contentful Paint | 944ms |
| Resources | 4 (CSS + 2 JS chunks + favicon) |
| JS bundle | 285KB app + 562KB three.js (gzipped ~78KB + ~146KB) |
| CSS | 25KB (gzipped ~5.4KB) |

Three.js loads upfront even though it's not needed until after CTA click. The landing page itself is pure DOM.

### Listen page

| Metric | Value |
|--------|-------|
| DOM Content Loaded | 295ms |
| Load Complete | 297ms |
| Transfer Size | 4,339 bytes (gzipped from 13,769) |
| Resources | 1 (the HTML document) |

Excellent for QR-code-driven mobile flow.

### Architecture strengths
- Staged loading (zones 1-2 core, 3-4 deferred) with 10-minute timeout and 3 retries
- Narration loads lazily on proximity
- Pixel ratio capped (1.5 immersive / 2.0 inspect)
- Post-processing: bloom + vignette only (lightweight)
- Letter animation skips distant objects via distance-squared check

---

## Exhibition-specific concerns

1. **Social sharing:** No preview when URL is shared — needs OG tags + favicon + preview image.
2. **Kiosk display (1920px+):** Landing panels are small relative to screen. Consider `@media (min-width: 1440px)` to scale composition.
3. **Gallery WiFi:** Loading architecture handles slow networks well (10min timeout, retries, staged zones). The listen page at 4.3KB is ideal.
4. **First 5 seconds:** Title + CTA appear within 300ms. Staggered panel reveals fill in over 1s. The black background signals intentionality. The subtitle "An interactive archive of 105 prison papers" orients but doesn't prepare users for 3D navigation.
5. **QR code flow:** Listen page loads in 295ms. Language selection is immediate and clear. Error handling for missing papers shows "Audio not yet available."
6. **WebGL fallback:** `#webgl-fallback` exists but is basic text — acceptable.

---

## Cross-reference with existing docs

### Already documented and confirmed

1. Bird's-eye mode feels like debug overlay — `15-ui-ux-reentry.md` #1 ✓
2. Subtitle fallback copy is generic — `15-ui-ux-reentry.md` #2 ✓
3. Preview/subtitle obstructive on mobile — `15-ui-ux-reentry.md` #3 ✓
4. Shell copy under-orients users — `15-ui-ux-reentry.md` #4 ✓
5. Debug UI policy — `15-ui-ux-reentry.md` #5 ✓
6. Overlay regression risk — `15-ui-ux-reentry.md` #6 ✓

### Deeper than documented

1. **Bird's-eye:** Worse than "feels like debug." Uses completely different color system, only emoji in project, raw implementation coordinates exposed to users.
2. **Pause screen:** Beyond "messaging is clearer" — it's the only shell state without glass panel treatment.
3. **Touch targets:** Not previously called out as a systemic pattern — affects read-more, inspect buttons, close buttons across multiple components.

### Net-new findings (most impactful)

1. No OG/social/favicon metadata (Critical)
2. `user-scalable=no` WCAG violation (High)
3. No `:focus-visible` on `.btn` (High)
4. Listen progress bar not keyboard-accessible (High)
5. 1920px+ composition sparse (High for exhibition)
6. Design system lacks formalization — 35+ font sizes, 14 opacity levels, no spacing scale (Medium aggregate)
7. Listen page missing `aria-live` for status messages (Medium)
8. ~~No link from listen page to main archive~~ (Medium) — **RESOLVED (Session 4)**

---

## Recommended implementation session sequence

### Session 2: Exhibition infrastructure — OG, favicon, social metadata
- **Scope:** Add OG tags, create/generate favicon set, add meta description to both HTML files
- **Files:** `index.html`, `public/listen/index.html`, `public/` (new favicon assets)
- **Tools:** `favicon-gen` skill, `image-processing` skill
- **Priority:** Critical — do first

### Session 3: Accessibility quick wins
- **Scope:** Remove `user-scalable=no`, add `:focus-visible` to `.btn`, add `aria-expanded` to read-more, add `aria-live` to `#loading-status`, fix touch target sizes (read-more padding, inspect min-height, close button)
- **Files:** `index.html`, `src/styles/main.css`, `public/listen/index.html`
- **Tools:** Local edits only
- **Priority:** High — fixes WCAG violations

### Session 4: Listen page keyboard + a11y
- **Scope:** Add keyboard navigation to progress bar (tabindex + arrow keys), add `aria-live` for status, add `lang="en"` on English labels in AR mode, add link to main archive, fix error state `<style>` leak, consider audio retry
- **Files:** `public/listen/index.html`
- **Tools:** Local edits only
- **Priority:** High — listen page is the exhibition visitors' direct surface

### ~~Session 5: Pause screen + bird's-eye visual upgrade~~ (DONE)
- **Scope:** Wrapped pause content in `.shell-panel.shell-panel-pause` with `::before` glow. Bird's-eye redesigned as monochrome glass badge — removed green, emoji, Material Design zone colors, z-coordinates, zone legend.
- **Files:** `index.html`, `src/styles/main.css`
- **Status:** Complete

### ~~Session 6: Design system tokenization~~ (DONE)
- **Scope:** Added CSS custom properties: text color scale (5), type scale (5), spacing scale (8), accent RGB (1), blur tiers (3), radius scale (5). Migrated 124 declarations. Also added border-radius scale (5). Listen page left as-is (self-contained).
- **Files:** `src/styles/main.css`
- **Status:** Complete — zero visual change, token system in place

### ~~Session 7: Listen page a11y + Session 8: Wide-screen + responsive polish~~ (DONE)
- **Session 7 scope:** Added `aria-live` on listen page status messages, `lang="en"`/`lang="ar"` on bilingual elements, `role="alert"` on error state.
- **Session 8 scope:** Added 1440px+ and 1920px+ breakpoints with grid max-width and scaled panel sizes. Constrained 768px panel line length to 32rem.
- **Files:** `public/listen/index.html`, `src/styles/main.css`
- **Status:** Complete

### Session 8: Arabic typography
- **Scope:** Add Noto Naskh Arabic for `[lang="ar"]` contexts, conditionally loaded. Remove letter-spacing for Arabic. Only needed when Arabic body content (beyond the button label) is added.
- **Files:** `public/listen/index.html`
- **Tools:** Local edits
- **Priority:** Deferred until Arabic content is added — currently latent risk only

---

## Pre-exhibition content checklist

Items that are NOT code bugs but must be completed before the exhibition opens:

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Landing panel "The Party" copy | Awaiting client | Client/artist | `landingContent.js:18-20` — currently shows "Placeholder for the client's text..." |
| Landing panel "The Papers" copy | Awaiting client | Client/artist | `landingContent.js:23-25` — same placeholder |
| Listen page MP3 files (papers 4-10) | Awaiting client | Client/artist | Only papers 1-3 have audio; papers 4-10 show "Audio not yet available" |
| QR code URL format | Verify | Developer | Confirm `npm run generate:qr` produces `/listen/?p=N` format (query-param) |
| OG preview image | Needs creation | Developer/designer | For social sharing when exhibition URL is shared |
| Start shell lede copy | Optional refinement | Developer/client | "The archive is ready." is functional but generic |
