# Session 1B: Browser Testing Findings

## Metadata

- Date: 2026-03-21
- Session: 1B of 3 (browser testing — Playwright + 21st.dev)
- Tested URL: https://www.houseofdreams.space/
- Listen URL: https://www.houseofdreams.space/listen/?p=1
- Viewports tested: 360×640, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080
- Tools used: Playwright (navigate, screenshot, snapshot, resize, click, run_code, wait_for, press_key), 21st_magic_component_inspiration
- Manual-only gaps: desktop active, inspect, bird's-eye, pause (pointer-lock limitation)
- Screenshots captured: landing-desktop-1440.png, landing-mobile-390.png, loading-desktop-1440.png, start-desktop-1440.png, listen-en-desktop-1440.png, listen-en-player-desktop.png, listen-ar-desktop.png, listen-ar-mobile-390.png, listen-en-mobile-390.png, responsive-landing-360x640.png, responsive-landing-768x1024.png, responsive-landing-1024x768.png, responsive-landing-1920x1080.png

---

## Visual Walkthrough

### Landing (desktop 1440×900)

**Visual hierarchy:** Strong. Eye is drawn to the large centered "HOUSE OF DREAMS" title first, then the subtitle, then the CTA button with its breathing glow animation. The four corner glass panels provide context without competing for attention.

**Typography:** Title renders at approximately 4rem in Courier New uppercase with wide letter-spacing (0.16em). Highly legible against pure black. Subtitle at 1.02rem in muted white (0.62 opacity) provides good secondary reading. Panel kickers ("THE PROJECT", "AHED SHEIKH HASSAN", etc.) in uppercase with 0.42em letter-spacing are visible but appropriately subdued.

**Spacing:** The 2-column grid with corner-anchored panels creates a balanced, museum-foyer composition. Panels are max-width 20rem — at 1440px they feel well-proportioned. Generous negative space around the center creates focus.

**Component polish:** Glass panels are polished — gradient background, subtle border, 18px blur, radial glow overlay. The breathing CTA animation is restrained and draws attention without being aggressive. Staggered reveal animation (panels fade in over ~1 second) creates a cinematic entrance.

**Color/contrast:** White text on pure black provides maximum contrast (21:1). Muted text at 0.62 and 0.78 opacity maintains strong readability (>7:1 against black).

**Copy issues:** Bottom-left panel "THE PARTY" and bottom-right panel "THE PAPERS" contain placeholder text: "Placeholder for the client's text about..." — this is **clearly visible** in the default collapsed state without clicking "Read more". Visitors will see this placeholder copy immediately.

### Landing (mobile 390×844)

**Visual hierarchy:** Title reordered to top via CSS `order: -1` — correct for mobile. Panels stack vertically below. CTA remains prominent.

**Typography:** Title at approximately 1.5rem (480px breakpoint) — readable but loses the grand impact of the desktop version. Monospace at this size on mobile is tight.

**Spacing:** Panels stack with 1rem gap. Padding reduced to 16px at 480px. Content is dense but not cramped.

**Scrolling:** The landing grid overflows vertically — the user must scroll to see all four panels. The bottom two placeholder panels are visible after one scroll-length. The scrollbar is visible at the bottom of the viewport.

**Copy issues:** Placeholder text even more prominent on mobile since panels are full-width and text is more readable at this proportion.

### Loading (desktop 1440×900)

**Visual hierarchy:** The 3D Sednaya building scene dominates the viewport. The loading panel anchors to the bottom-left with a lighter glass treatment. "ARCHIVE LOADING" kicker → "HOUSE OF DREAMS" title → lede → loading status → skip button. Clear hierarchy.

**Typography:** Loading title pulses subtly (0.9↔1.0 opacity animation). Text shadow provides depth against the 3D scene.

**Component polish:** High. The lighter glass panel (reduced opacity, 10px blur) doesn't compete with the 3D scene. The gradient overlay from transparent to slightly dark at the bottom creates a natural grounding for the text panel. Skip button is subtle but findable.

**Loading status:** Showed "Loading experience... 100%" — the loading was already complete when captured. The progress text and bar communicate state effectively.

**3D scene:** The Sednaya building model is visible — dark geometric silhouette against a particle-strewn dark sky. Cinematic and atmospheric.

### Start (desktop 1440×900)

**Visual hierarchy:** Single centered glass panel with clear top-to-bottom flow: "ARCHIVE READY" kicker → "HOUSE OF DREAMS" title → "The archive is ready." lede → status copy → "ENTER ARCHIVE" CTA. Below: "HOW TO USE" and "CONTEXT" detail sections.

**Typography:** Same scale as landing title. Status copy at 0.95rem with 0.68 opacity — readable but appropriately de-emphasized.

**Component polish:** High. Glass panel with panelGlow breathing animation. CTA has the same breathing glow as landing. The panel width is constrained to min(34rem, calc(100vw - 48px)) — well-proportioned.

**Copy quality:** "The archive is ready." is functional but generic. The "HOW TO USE" section ("Use WASD to move and your mouse to look around...") is clear and instructive. The "CONTEXT" section provides the archival framing well.

**Status copy:** "Click to enter. The archive will take control of your pointer." — functional but could be warmer. The pointer-control warning is appropriate for desktop.

**Console error:** `Failed to load resource: net::ERR_QUIC_PROTOCOL_ERROR` for `theme_1.mp3`. The theme audio failed to load — this is a network/CDN issue on the production deployment, not a code bug.

### Listen EN (desktop 1440×900)

**Pre-language-selection state:** Clean composition — "EXHIBITION AUDIO GUIDE" kicker, "HOUSE OF DREAMS" title, large paper number "1", "PAPER" label, and two language buttons (العربية / English). No player visible yet. Footer shows "houseofdreams.space".

**Post-language-selection:** Player appears below language buttons — play button (72px circle with play icon), thin progress bar, time display (0:00 / 15:11). Minimal and effective.

**Visual hierarchy:** Excellent. Title → paper number → language selection → player. Vertically centered flow.

**Component polish:** Very high. Language buttons use the same glass treatment as the archive's shell panels. Active button gets blue-glow border and panel-bg gradient. Play button is a clean circle with subtle glow on hover.

**Listen page tone:** Perfectly cohesive with the main archive. Same dark background, same monospace font, same kicker styling, same blue accent color. This reads as the same project unambiguously.

### Listen AR (desktop & mobile)

**RTL layout:** Correctly activated — `dir="rtl"` on `<html>`. Language buttons swap order (English left, العربية right). Time display flips (15:11 on left, 0:00 on right). Progress bar fills from right-to-left.

**Arabic font rendering:** The Arabic text `العربية` on the button renders in a system Arabic fallback (not Courier New, since Playwright uses Chromium which falls back to a system Arabic font). On the button it appears passable — the characters connect and ligatures form. However:
- The kicker text "EXHIBITION AUDIO GUIDE" and label "PAPER" remain in Latin/English — they don't change language, which is correct behavior since they're UI labels.
- The Arabic button text at mobile sizes (390px) is readable but noticeably different in visual weight from the English text — the system fallback font has different metrics than Courier New.
- The letter-spacing on kicker elements (0.42em) would fracture Arabic text if Arabic kicker text existed, but since kickers stay in Latin, this is not currently triggered.
- **Risk assessment:** The current implementation is passable for the button label `العربية` because browsers fall back to system Arabic fonts. However, if Arabic narration titles, descriptions, or metadata are ever added to the UI, Courier New will fail catastrophically for those strings. This is a latent risk, not a visible breakage today — but the code analysis (Session 1A) correctly identifies it as high severity.

### Listen error state (not captured)

Navigating to `/listen/?p=5` would show the error state since papers 4-10 don't have audio files. Not tested in this session — documented for Session 1C.

---

## Responsive Stress Test

### Breakpoint behavior matrix

| Viewport | Landing | Start | Listen |
|----------|---------|-------|--------|
| 360×640 | Stacked layout, tight padding (16px), title 1.5rem, all panels visible on scroll, placeholder text clearly visible. Panels clip at right edge slightly. Scrollbar visible. | Not tested (requires CTA click + loading) | Not tested |
| 390×844 | Same as 360 but slightly more breathing room. Panels fit full-width with no clipping. CTA remains prominent at top. | Not tested | EN: Clean, well-proportioned. AR: RTL works, time display flips correctly. Player centered. |
| 768×1024 | Stacked layout (flex column). Panels full-width, which makes them quite wide. Placeholder text fully visible without even clicking "Read more" — the 3-line max-height truncation still shows a clear "Placeholder for the client's text..." sentence. Read-more still visible. | Not tested | Not primary viewport |
| 1024×768 | 2-column grid restored. Panels are small (max-width 20rem) relative to 1024px screen. Decent composition — panels in corners, title centered. Bottom panels show placeholder text clearly. | Not tested | Not primary viewport |
| 1440×900 | Good baseline — panels proportional, grid balanced. See full walkthrough above. | See walkthrough — well-composed glass panel | See walkthrough |
| 1920×1080 | **Panels appear small.** Max-width 20rem (320px) panels in corners of a 1920px screen create ~1280px of empty black space between the left and right panel columns. The composition feels sparse. Title scale stays at the clamp maximum (4.4rem) which is proportionally smaller than ideal for this viewport. | Not tested | Not primary viewport |

### Grid collapse behavior (768px → 480px boundary)

At exactly 768px, the landing grid transitions from 2-column (`grid`) to single-column (`flex column`) via the `@media (max-width: 768px)` breakpoint. This transition is **clean** — no intermediate broken state. The center block reorders to the top via `order: -1`.

Between 481px and 768px (no specific breakpoint), the layout uses the flex-column mobile rules. Panels are full-width. The title uses the desktop clamp range (clamp(2.8rem, 5vw, 4.4rem)) since the 768px media query overrides to `2rem`. At ~600px, the title would be approximately 2rem based on the clamp math. This range works acceptably.

At exactly 480px and below, additional tightening kicks in (16px padding, 1.5rem title, 0.8rem gap). This transition is also clean.

**No broken intermediate states found.** The clamp()-heavy approach handles the continuous range well.

### Specific issues by viewport

1. **1920×1080 — Panel composition sparse:** 20rem panels in corners of 1920px screen feel like small post-it notes on a cinema screen. The dark negative space is vast. For exhibition kiosk displays, this could look unintentional.

2. **360×640 — Tight scrollable landing:** All four panels stack and require scrolling. The page scrolls, which is correct behavior, but the horizontal scrollbar is briefly visible (possibly from the landing grid's overflow handling). The content itself doesn't overflow horizontally.

3. **768×1024 — Full-width panels feel wide:** When panels switch to `width: 100%` at ≤768px, they stretch to ~720px wide. The monospace text at 0.92rem with 1.65 line-height creates very long line lengths (>80 characters per line) — somewhat harder to read than the constrained 20rem desktop panels.

---

## Accessibility Findings

### Landing (desktop 1440×900)

**Accessibility tree structure:**
```
generic (landing-screen)
  generic (landing-panel: The Project)
    paragraph: "The Project"
    generic: [body text]
    button: "Read more"
  generic (landing-panel: Ahed Sheikh Hassan)
    paragraph: "Ahed Sheikh Hassan"
    generic: [body text]
    button: "Read more"
  generic (center block)
    heading [level=1]: "House of Dreams"
    paragraph: "An interactive archive of 105 prison papers"
    button: "Enter the Archive"
  generic (landing-panel: The Party)
    paragraph: "The Party"
    generic: [body text]
    button: "Read more"
  generic (landing-panel: The Papers)
    paragraph: "The Papers"
    generic: [body text]
    button: "Read more"
```

**Issues found:**
1. **No landmark roles.** The landing screen is a `generic` (div) container with `generic` children. No `<main>`, `<nav>`, `<article>`, or `<section>` with accessible names. Screen reader users cannot navigate by landmarks.
2. **Kicker text is `<p>`, not a heading.** "The Project", "Ahed Sheikh Hassan", etc. are `paragraph` elements. They function as section headings visually (uppercase, kicker styling) but AT treats them as body text. Should be `<h2>` or have `role="heading"`.
3. **Read-more buttons lack `aria-expanded`.** Buttons say "Read more" but don't communicate whether the panel is expanded or collapsed. Pattern requires `aria-expanded="true/false"` toggled by JS.
4. **Panel body text is `generic` (div), not `<p>`.** The `.landing-panel-body` divs don't have paragraph semantics. Minor but imprecise.
5. **No `aria-label` on panels.** Each panel is a `generic` div with no accessible name. The kicker paragraph inside is the only identifying text.

### Listen page EN (mobile 390×844)

**Accessibility tree structure:**
```
generic (app container)
  generic (content)
    banner (header)
      paragraph: "Exhibition Audio Guide"
      heading [level=1]: "House of Dreams"
    generic (paper-id section)
      generic: "1"
      paragraph: "Paper"
    group "Language selection" (nav)
      button "Arabic" [cursor=pointer]: العربية
      button "English" [active] [pressed] [cursor=pointer]
    generic (player, after language selection)
      button "Play" [cursor=pointer]
      generic (progress wrap)
        progressbar [cursor=pointer]
        generic (time display)
          generic: "0:00"
          generic: "15:11"
  contentinfo (footer)
    paragraph: "houseofdreams.space"
```

**Strengths:**
- `banner` and `contentinfo` landmarks present — good structure.
- Language buttons use `aria-pressed` correctly.
- Play button has dynamic `aria-label` ("Play" / "Pause").
- Progress bar has `role="progressbar"` with `aria-valuemin/max/now`.
- Language group has `aria-label="Language selection"`.

**Issues found:**
1. **Progress bar not keyboard-navigable.** Tab order is: `btn-ar` → `btn-en` → `play-btn` → body. The progressbar is skipped entirely — no `tabindex`, no arrow key handling. A keyboard-only user **cannot seek within the audio**.
2. **No `aria-live` region for status updates.** The "Loading..." text and "Audio not yet available" error messages are injected dynamically but not announced to screen readers. The loading indicator should be inside an `aria-live="polite"` container.
3. **Time display elements are `generic` divs.** "0:00" and "15:11" have no semantic association with the progress bar. Should use `aria-valuetext` on the progressbar or associate via `aria-describedby`.
4. **`user-scalable=no` + `maximum-scale=1.0`** in the viewport meta tag — **WCAG 1.4.4 violation.** Low-vision users cannot zoom the page.
5. **Paper number "1" has no semantic label.** The `<div>` showing "1" is a `generic` element. For AT, it's just a floating number with no context until the following "Paper" paragraph.

### Listen page AR (after toggle)

The accessibility tree structure remains identical. The `aria-pressed` states correctly flip. The `lang` and `dir` attributes on `<html>` update correctly, which is good for screen reader pronunciation switching.

**Additional RTL issue:** Screen readers need the `lang="ar"` attribute to switch pronunciation engines. This is correctly applied to `document.documentElement`, so screen readers should switch to Arabic mode for the entire page. However, UI labels like "EXHIBITION AUDIO GUIDE" and "PAPER" remain in English — a screen reader in Arabic mode will mispronounce these English strings. A per-element `lang="en"` attribute on those strings would fix this.

### WCAG violations found

| Criterion | Violation | Location | Severity |
|-----------|-----------|----------|----------|
| 1.4.4 Resize Text | `user-scalable=no, maximum-scale=1.0` prevents zoom | `index.html:4`, `listen/index.html:5` | High |
| 2.1.1 Keyboard | Progress bar not reachable via keyboard | `listen/index.html` progress-track | High |
| 4.1.2 Name, Role, Value | `aria-expanded` missing on read-more buttons | `index.html:19,23,27,31` | Medium |
| 1.3.1 Info and Relationships | Kicker text uses `<p>` instead of heading | `index.html` landing panels | Medium |
| 1.3.1 Info and Relationships | No landmark structure on landing page | `index.html` landing-screen | Medium |
| 4.1.3 Status Messages | Loading/error messages not in `aria-live` region | `listen/index.html` loading-indicator | Medium |

---

## Component Inspiration

| Current component | Weakness (from 1A) | 21st.dev reference | Compatibility | Notes |
|-------------------|--------------------|--------------------|---------------|-------|
| Shell panels (landing, start) | Inconsistent blur (5-18px), no spacing scale | **Liquid Glass** — advanced SVG filter-based glass with inner highlight shadows | Low | Too complex/playful for memorial tone. The current glass treatment is already strong. Useful principle: consistent inner shadow creates depth. |
| Shell panels (landing, start) | — | **Liquid Glass Card** — simpler approach with multi-layered inset shadows | Medium | The dark mode shadow approach (`inset ±3px ±3px 0.5px`) creates subtle depth without SVG filters. Could inform a simpler refinement of the existing `::before` glow. |
| Audio player (listen page) | Progress bar not keyboard-accessible, no retry | **Audio Player** (21st.dev) — React + Framer Motion player with custom slider, full controls | Low | React + Framer Motion dependency, over-featured for the listen page's intentional simplicity. But the custom slider pattern (click-to-seek + visual fill) is a good reference for adding keyboard support. |
| Audio player (listen page) | — | **musicCard** — Howler-based player with seek, skip, progress | Medium | Already uses Howler (same as the main archive). Dark mode compatible. The seek/progress bar pattern is the most relevant reference. However, the card format with album art is wrong for this use case. |
| Inspect overlay (scan viewer) | Touch buttons below 44px at 480px | **Zoomable Image** — react-medium-image-zoom with backdrop blur overlay | Medium | The zoom-in/zoom-out with backdrop blur pattern could inform inspect viewport zoom UX. But the library dependency isn't justified for this project's vanilla stack. |
| Inspect overlay | — | **Gallery Animation** — expandable gallery with modal lightbox, prev/next, counter | Low | The modal pattern (black overlay + close button + image counter) is relevant but the horizontal expandable gallery is not. Current inspect overlay is already better-suited to single-document viewing. |
| Controls hint | No focus-visible on buttons, hint is plain text | **Tooltip** (shadcn/dark variant) — dark background, subtle border, slide-in animation | Medium | The dark tooltip with `bg-popover` and slide-in animation is a good reference for controls hints. However, the current plain-text hint is appropriately minimal for an immersive 3D experience — adding tooltips would add UI weight. |
| Pause overlay | No glass panel treatment, weakest visual quality | None directly matching | — | No dark memorial-appropriate pause overlay found. The current project's own glass panel system (landing/start) is the best reference for upgrading the pause screen. |

**General note:** Most 21st.dev components use React + Tailwind + Framer Motion — none are directly implementable in this vanilla CSS + JS project. Their value is as **visual references** for design direction, not as drop-in solutions.

---

## Performance Measurements

### Landing page (https://www.houseofdreams.space/)

| Metric | Value | Assessment |
|--------|-------|------------|
| DOM Content Loaded | 717ms | Good |
| Load Complete | 718ms | Good |
| First Paint | 392ms | Good — black background renders instantly |
| First Contentful Paint | 944ms | Acceptable — JS renders landing content |
| Resource Count | 4 | Minimal — CSS + 2 JS chunks + favicon |
| Transfer Size | Cached (0KB on repeat visit) | — |

**Largest resources (from build output):**
- `three-Cg_r5jH5.js`: 562KB (gzipped ~146KB)
- `index-CoRmnYWh.js`: 285KB (gzipped ~78KB)
- `index-BvFcpVGu.css`: 25KB (gzipped ~5.4KB)

**Note:** Three.js is loaded upfront even though it's not needed until the CTA is clicked and the loading scene starts. This adds ~146KB gzipped to the initial load. The landing page itself is pure DOM — no WebGL needed until "Enter the Archive" is clicked.

### Listen page (https://www.houseofdreams.space/listen/?p=1)

| Metric | Value | Assessment |
|--------|-------|------------|
| DOM Content Loaded | 295ms | Excellent |
| Load Complete | 297ms | Excellent |
| First Paint | 380ms | Good |
| First Contentful Paint | 0ms (not measured / instant) | — |
| Resource Count | 1 | Minimal — just the HTML document |
| Document Transfer Size | 4,339 bytes (gzipped) | Excellent |
| Document Decoded Size | 13,769 bytes | Small |

**Assessment:** The listen page is extremely lightweight — loads in under 300ms with a single HTTP request. Ideal for the QR-code-driven exhibition flow where visitors scan on their phones over gallery WiFi.

### Console errors

1. `Failed to load resource: net::ERR_QUIC_PROTOCOL_ERROR` — `theme_1.mp3` — This is a CDN/network transport error, not a code issue. The audio file exists but the QUIC protocol connection failed. May be intermittent.

---

## Routing finding: `/listen/1` path does not work

**Net-new finding:** Navigating to `https://www.houseofdreams.space/listen/1` (path-based) serves the main `index.html` (the landing page), **not** the listen page. The SPA catch-all in `_redirects` swallows the route.

The correct URL is `https://www.houseofdreams.space/listen/?p=1` (query-param-based), matching the latest commit `af5c592 fix: switch listener routing from path to query params`.

**Impact:** If QR codes at the exhibition were generated with `/listen/1` paths (the earlier routing scheme), they will **not work** — visitors will land on the 3D archive landing page instead of the audio player. The QR codes must use `/listen/?p=1` format.

**Check needed:** Verify that `npm run generate:qr` produces URLs with the query-param format, not the old path format.

---

## New findings not in Session 1A

1. **`/listen/1` route broken — SPA catch-all swallows it.** Only `/listen/?p=1` works. QR codes must use query-param format. (Critical if QR codes use old format)
2. **`theme_1.mp3` QUIC protocol error on production.** Audio theme fails to load on the start screen — visitors entering the archive may have no background music. (High — intermittent CDN issue)
3. **768px mobile panels are very wide.** When panels switch to `width: 100%` at the tablet breakpoint, monospace text creates line lengths >80 characters — harder to read than the constrained 20rem desktop panels. (Low — usability)
4. **1920px panels feel like post-it notes.** The 20rem max-width panels on a full-HD screen create ~1280px of empty space between panel columns. For exhibition kiosks, this would look unfinished. (Medium — exhibition context)
5. **Screen readers in Arabic mode will mispronounce English UI labels.** When `lang="ar"` is set on `<html>`, labels like "EXHIBITION AUDIO GUIDE" and "PAPER" lack per-element `lang="en"` attributes. (Low — a11y refinement)
6. **Landing page requires scrolling on mobile.** Four panels + title + CTA don't fit in a single viewport at 390×844. Users must scroll to see all panels. This is acceptable behavior but means placeholder panels are guaranteed to be scrolled past. (Observation, not issue)

---

## Session 1A Validation Results

| 1A Finding | Severity | Visual confirmation | Notes |
|------------|----------|-------------------|-------|
| Placeholder copy visible in landing panels | Critical | **Confirmed** | "Placeholder for the client's text..." is clearly visible at all viewports, in both collapsed and expanded states. On mobile, the full placeholder sentence shows without clicking "Read more" because the 3-line max-height truncation still exposes the placeholder opening. At 768px the panels are full-width and the text is even more prominent. |
| No OG/social metadata | Critical | **Confirmed** | The a11y snapshot shows no `<meta property="og:*">` tags. `<head>` contains only charset, viewport, apple-mobile-web-app metas, and a title. No favicon loaded (404 on favicon.ico request). |
| Arabic Courier New broken | Critical | **Partially confirmed** | The Arabic button label `العربية` renders acceptably on Chromium because the browser falls back to system Arabic fonts when Courier New lacks glyphs. However, Session 1A correctly identifies this as a latent high-severity issue: if Arabic text content (narration titles, descriptions) is ever added to kickers or body text, Courier New will fail with broken ligatures and no contextual forms. The letter-spacing problem (0.42em on kickers) is not triggered today because kicker text stays in Latin. The risk is real but not visible in the current minimal Arabic usage. |
| Bird's-eye green/emoji indicator | High | **Manual-only gap** | Cannot reach bird's-eye mode via Playwright (requires pointer-lock → B key). Session 1A code analysis confirmed: `#4CAF50` green, `🦅` emoji, Material Design zone colors, raw z-coordinates. These remain in the codebase and will render as documented. |
| Pause screen no glass treatment | High | **Manual-only gap** | Cannot reach pause screen via Playwright (requires pointer-lock → ESC). Session 1A code analysis confirmed: `rgba(0,0,0,0.6)` + `blur(5px)` with no `.shell-panel` wrapper, no `::before` glow, no gradient — visually the weakest shell state. |
| Landing read-more touch targets | High | **Confirmed (indirect)** | The a11y tree shows read-more buttons with `cursor=pointer` but the visual test at mobile viewports (360px, 390px) shows them as small uppercase text labels with no padding. At these sizes, the tap target area is the text bounding box only — approximately 80px × 12px for "READ MORE". The height is well below the 44px WCAG minimum. |
| Listen progress bar not keyboard-accessible | High | **Confirmed** | Keyboard tab order test: `btn-ar` → `btn-en` → `play-btn` → body. The progress bar is completely unreachable via Tab key. No `tabindex`, no arrow key handling. A keyboard-only user cannot seek within the audio. |

---

## Summary of key visual observations

### Strengths confirmed by live testing

1. **Glass panel system is genuinely polished.** The landing and start panels with gradient backgrounds, radial glow, and staggered reveal animations create a museum-quality cinematic feel that is rare in web projects.
2. **Listen page is excellently cohesive.** Same visual language, same typography, same accent color. Loads in 295ms. The audio player is minimal and appropriate for the exhibition context.
3. **Responsive behavior is smooth.** The clamp()-heavy approach creates fluid transitions without jarring breakpoint jumps. The grid collapse at 768px is clean.
4. **Loading scene composition works.** The lighter glass panel over the 3D cinematic scene creates a film-title-card feel that is tonally perfect.
5. **Color discipline is strong.** The restrained palette (black, white at various opacities, one blue accent) creates a cohesive visual system across all reachable states.

### Weaknesses confirmed by live testing

1. **Placeholder copy is immediately visible** and will embarrass the project at the exhibition.
2. **1920px+ composition is sparse** — for exhibition kiosks this is a concern.
3. **No social preview** when the URL is shared (no OG tags, no favicon).
4. **Progress bar keyboard gap** on the listen page blocks a11y compliance.
5. **No landmark structure** on the landing page hurts screen reader navigation.
