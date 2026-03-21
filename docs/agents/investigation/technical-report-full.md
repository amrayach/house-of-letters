# House of Dreams — UI/UX Investigation Technical Report

*Generated 2026-03-21 from Sessions 1A, 1B, 1C*

---

## What this investigation covered

Three sessions analyzed the entire frontend surface of the House of Dreams 3D memorial archive, preparing for an upcoming physical exhibition.

- **Session 1A** — Read every line of CSS (1,579 lines), HTML, JS config, and the standalone listen page. Extracted every design token, font size, color value, spacing value, and component structure.
- **Session 1B** — Visited the live production site with Playwright. Captured 13 screenshots across 6 viewports (360px through 1920px). Tested keyboard navigation, accessibility trees, and page performance.
- **Session 1C** — Merged, deduplicated, applied operator corrections, and produced the final canonical document at `docs/agents/shared/19-uiux-investigation-findings.md`.

---

## Overall Assessment

**The core visual design is strong.** The glass panel system, staggered reveal animations, breathing glow CTAs, and disciplined dark palette create a genuinely cinematic, museum-quality experience. The listen page loads in 295ms at 4.3KB — perfect for QR-driven exhibition flow.

**The gaps are infrastructure and consistency**, not design vision:
- No social sharing metadata at all
- Accessibility violations (zoom blocked, keyboard gaps)
- Design system is ad-hoc under the hood (35+ font sizes, 14 opacity levels)
- A few components break the visual tone (bird's-eye, pause screen)

---

## Findings Summary: 32 Total

### 1 Critical — Blocks Exhibition Promotion

**#1. No OG tags, favicon, or social metadata.** Both `index.html` and the listen page lack `og:title`, `og:description`, `og:image`, `twitter:card`, favicon, and `meta description`. When anyone shares the exhibition URL on WhatsApp, Telegram, Twitter, or Facebook — no preview image, no description, no icon appears.

---

### 9 High — Meaningfully Degrade Experience

**#2. Zoom disabled (WCAG violation).** Both pages have `user-scalable=no, maximum-scale=1.0`. Low-vision users cannot pinch-to-zoom.

**#3. Bird's-eye indicator is a tonal rupture.** Uses bright green `#4CAF50`, a emoji, Material Design zone colors, and raw z-coordinate numbers. A debug overlay in a memorial archive.

**#4. Pause screen is the weakest shell state.** Every other full-screen state uses the polished glass panel system. The pause screen uses plain dark overlay with minimal blur. Looks unfinished compared to everything else.

**#5. Landing read-more buttons have zero padding.** Touch target is ~80x12px — well below the 44px WCAG minimum. Nearly impossible to tap on mobile.

**#6. No focus indicator on primary buttons.** Keyboard users see nothing when they Tab to Enter Archive, Start, Resume, or Skip buttons.

**#7. Inspect buttons too small at 480px.** Padding drops at the smallest breakpoint, yielding ~32px button height. Below 44px minimum.

**#8. Listen page progress bar not keyboard-accessible.** The progress/scrub bar is completely unreachable via keyboard. Users who can't use a pointer cannot seek within the audio.

**#9. Arabic typography is a latent risk.** Courier New has no proper Arabic glyph support. Currently passable for the button label only. Will break if Arabic body text is ever added.

**#10. Landing page sparse at 1920px+.** Panels are capped at 320px wide on a 1920px screen. For exhibition kiosk displays, this looks unintentional.

---

### 13 Medium — Polish That Raises Quality

- 14 distinct white opacity levels should collapse to 5 semantic tokens
- 35+ ad-hoc font sizes should normalize to a 7-step scale
- 4 distinct blue accent hues should unify to one
- 5 distinct blur values should normalize to 3 tiers
- 18+ ad-hoc spacing values need a consistent scale
- Missing ARIA attributes on loading status and read-more buttons
- No landmark structure on landing page
- No link from listen page to main archive
- Small touch targets on notice close button
- 768px tablet panels create overly long text lines
- English labels mispronounced by screen readers in Arabic mode
- 10 distinct border-radius values should normalize to 5

---

### 9 Low — Nice-to-Have Refinements

Dead CSS token, unstyled HTML classes, listen page DOM leak per error, barely perceptible title animation, mixed letter-spacing units, generic start screen copy, no audio retry, imprecise ARIA role, border-radius variations.

---

## Design System State

11 CSS custom properties exist (panels, borders, glow). Missing: semantic text colors (5 levels), type scale (7 steps), spacing scale (10 steps), blur tiers (3), radius scale (5), focus ring color, transition tokens. All fixable in vanilla CSS.

---

## Performance

| Surface | Load Time | Transfer | Assessment |
|---------|-----------|----------|------------|
| Landing page | FP 392ms, FCP 944ms | ~224KB gzipped | Good |
| Listen page | 295ms total | 4.3KB | Excellent for QR flow |

---

## Implementation Plan — 8 Sessions

| Session | Focus | Priority |
|---------|-------|----------|
| 2 | OG tags + favicon + social metadata | Critical |
| 3 | Accessibility quick wins — zoom, focus, touch targets, ARIA | High |
| 4 | Listen page keyboard + a11y | High |
| 5 | Pause + bird's-eye visual upgrade | High |
| 6 | Design system tokenization | Medium |
| 7 | Wide-screen + responsive polish | Medium |
| 8 | Arabic typography (deferred) | When Arabic content is added |

---

## Pre-Exhibition Content Checklist

| Item | Status |
|------|--------|
| Landing "The Party" panel copy | Awaiting client |
| Landing "The Papers" panel copy | Awaiting client |
| Listen page MP3s for papers 4-10 | Awaiting client |
| OG preview image | Needs creation |
| QR code URL format verification | Needs confirmation |

---

## Strengths Worth Preserving

1. Glass panel system — museum-quality visual treatment
2. Color discipline — black, white at opacities, one blue accent
3. Listen page cohesion — identical visual language, 295ms load
4. Loading scene — lighter glass over 3D cinematic = film-title-card feel
5. Responsive architecture — smooth fluid scaling, no broken transitions
