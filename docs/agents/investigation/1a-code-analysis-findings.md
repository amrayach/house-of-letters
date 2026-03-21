# Session 1A: Code Analysis Findings

## Metadata

- Date: 2026-03-21
- Session: 1A of 3 (code analysis only — no browser testing)
- Files inspected: `index.html`, `src/styles/main.css` (1579 lines), `src/main.js`, `src/config/constants.js`, `src/config/landingContent.js`, `src/config/startShellContent.js`, `public/listen/index.html`, `vite.config.js`, `package.json`, `docs/agents/shared/15-ui-ux-reentry.md`, `docs/agents/shared/16-visual-regression-hotspots.md`, `PLANS.md`
- Skills used: ui-ux-pro-max (design-system, style, color, typography, ux, landing domain searches)

---

## Design System Audit

### Current tokens (`:root` custom properties)

| Property | Value | Usage |
|----------|-------|-------|
| `--primary-color` | `#ffffff` | Text, button borders, reticle |
| `--bg-color` | `#000000` | Body/overlay backgrounds |
| `--overlay-bg` | `rgba(0, 0, 0, 0.85)` | Declared but not referenced in main.css |
| `--font-family` | `'Courier New', Courier, monospace` | All text site-wide |
| `--shell-panel-bg` | `linear-gradient(180deg, rgba(11,16,26,0.78) 0%, rgba(5,6,10,0.9) 100%)` | Glass panel backgrounds |
| `--shell-panel-border` | `rgba(255, 255, 255, 0.2)` | Panel borders |
| `--shell-panel-shadow` | `0 24px 90px rgba(0, 0, 0, 0.55)` | Panel depth shadows |
| `--shell-kicker-color` | `rgba(255, 255, 255, 0.62)` | Section label text |
| `--shell-glow` | `rgba(112, 144, 255, 0.14)` | Radial glow on panels |
| `--zone1-glow` | `102, 136, 204` | Raw RGB for rgba() construction |
| `--safe-area-*` | `env(safe-area-inset-*, 0px)` | Notch-safe positioning |

**Observation:** 11 custom properties total. Several semantic values that repeat across the file are not tokenized.

### Font inventory

| Value | Count of uses | Where |
|-------|--------------|-------|
| `'Courier New', Courier, monospace` | 1 (via `--font-family`) | Body, all inherited, listen page |
| `inherit` | 2 | `.btn`, `.landing-read-more` |
| `monospace` | 1 | Debug panel `#speed-value` |

**Single font family throughout.** No heading vs body distinction, no Arabic-capable fallback.

### Font size inventory (all distinct values)

| Value | Where | Notes |
|-------|-------|-------|
| `clamp(2.8rem, 5vw, 4.4rem)` | `.landing-title`, `#start-screen h1` | Largest display |
| `clamp(2.4rem, 4vw, 3.5rem)` | `.loading-title` | Loading display |
| `clamp(2rem, 4vw, 3.2rem)` | WebGL fallback h1 | Fallback display |
| `clamp(1.4rem, 3vw, 2.2rem)` | `.inspect-heading h2` | Inspect title |
| `2rem` | `#pause-screen h2` | Pause heading |
| `1.5rem` | Mobile pause h2, mobile titles (480px breakpoint) | Responsive override |
| `1.2rem` | `.btn`, `.bird-eye-title` | Button, bird's-eye |
| `1.05rem` | `.subtitle` | Subtitle text |
| `1.02rem` | `.landing-subtitle`, `.shell-lede` | Body emphasis |
| `1rem` | `#loading-status`, WebGL fallback p, `.btn` (768px) | Base body |
| `0.96rem` | `.subtitle` (768px) | Responsive subtitle |
| `0.95rem` | `.screen-status` | Status messages |
| `0.94rem` | `.landing-subtitle` (768px), `.shell-lede` (768px) | Responsive body |
| `0.92rem` | `.landing-panel-body` | Panel body |
| `0.9rem` | `#controls-hint`, `.debug-row`, `.debug-title`, `.look-hint` | Small UI text |
| `0.88rem` | `.screen-status` (768px) | Responsive status |
| `0.86rem` | `.landing-panel-body` (480px) | Responsive panel |
| `0.85rem` | `#deferred-load-notice-text`, `.bird-eye-controls` | Notice text |
| `0.84rem` | `.btn-inspect` | Inspect buttons |
| `0.82rem` | `.btn-inspect-secondary` (implied via opacity) | Inspect secondary |
| `0.8rem` | `#loading-progress`, `#inspect-prompt-copy`, `.inspect-controls-desktop`, `.btn-skip` | Small labels |
| `0.76rem` | `.shell-kicker`, `.btn-inspect` (480px) | Kicker labels |
| `0.75rem` | `.legend-item` | Legend text |
| `0.74rem` | `#touch-deferred-status` | Touch status |
| `0.72rem` | `.landing-read-more`, `#inspect-side-badge`, `.preview-label`, `#inspect-prompt-copy` (480px), `#touch-deferred-status` (768px) | Micro labels |
| `0.7rem` | `.shell-kicker` (768px) | Responsive kicker |
| `0.68rem` | `.screen-status` (implied opacity variant) | — |

**35+ distinct font sizes with no mathematical scale.** Sizes cluster around 0.7–1.05rem for body text but use fractional rem values (0.72, 0.74, 0.76, 0.84, 0.86, 0.88, 0.92, 0.94, 0.95, 1.02, 1.05) that indicate ad-hoc tuning rather than a system.

### Letter-spacing inventory

| Value | Where |
|-------|-------|
| `0.42em` | `.shell-kicker`, listen page kicker |
| `0.34em` | `.shell-kicker` (768px) |
| `0.2em` | `.landing-read-more`, `#inspect-side-badge`, `.preview-label` |
| `0.18em` | `.btn-inspect` |
| `0.16em` | `.landing-title`, `.loading-title`, WebGL h1, `.shell-lede`, `#inspect-prompt-copy`, `.inspect-controls-desktop` |
| `0.14em` | `.landing-title` (768px), `#start-screen h1` (768px), listen page title |
| `0.12em` | `.inspect-heading h2`, `#inspect-prompt-copy` (480px) |
| `8px` | `.loading-title` |
| `4px` | `.loading-title` (768px) |
| `3px` | `.loading-title` (480px), `#pause-screen h2` |
| `2px` | `#loading-status`, `.debug-title`, `.bird-eye-controls`, `.look-hint`, `.btn`, `.preview-label` |

**Mixed units:** `em` and `px` used for the same property. 12 distinct values.

### Line-height inventory

| Value | Where |
|-------|-------|
| `1.7` | `.landing-subtitle`, `.shell-lede`, WebGL fallback |
| `1.65` | `.landing-panel-body` |
| `1.6` | `.screen-status` |
| `1.55` | `.subtitle` |
| `1.5` | `#controls-hint`, `#deferred-load-notice-text`, `.legend-item`, listen page |
| `1.45` | `#touch-deferred-status` |
| `1.2` | Listen page title |
| `1.1` | Listen page paper-number |

**8 distinct values** — relatively constrained but still without a defined scale.

### Color inventory (non-token hardcoded values)

**White text at different opacity levels:**

| Opacity | Where |
|---------|-------|
| `1.0` (#ffffff) | Primary text, buttons |
| `0.88` | `#deferred-load-notice-text`, `#touch-deferred-status`, `.landing-read-more:hover` |
| `0.84` | `#inspect-prompt-copy` |
| `0.82` | `.shell-lede`, `#inspect-side-badge` |
| `0.8` | `#reticle`, `.bird-eye-controls`, `.btn-skip:hover` border |
| `0.78` | `.landing-panel-body` |
| `0.72` | WebGL fallback text |
| `0.7` | `.preview-label`, `.legend-item` |
| `0.62` | `--shell-kicker-color`, `.landing-subtitle` |
| `0.6` | `#controls-hint`, `#deferred-load-notice-close` |
| `0.56` | `#loading-progress` |
| `0.54` | `.landing-read-more` |
| `0.5` | `#joystick-knob` |
| `0.4` | `.look-hint` |

**14 distinct white opacity levels** — the largest source of design inconsistency. These should collapse into 4–5 semantic levels.

**Blue accent (zone1-glow family):**

| Value | Where |
|-------|-------|
| `rgba(112, 144, 255, 0.14)` | `--shell-glow` (panel radials) |
| `rgba(112, 144, 255, 0.12)` | Loading panel radial |
| `rgba(112, 144, 255, 0.1)` | Inspect viewport radial |
| `rgba(112, 144, 255, 0.08)` | Listen page button radial |
| `rgba(112, 144, 255, 0.06)` | Start screen radial |
| `rgba(123, 145, 255, 0.12)` | Start screen background radial |
| `rgba(102, 136, 204, …)` | CTA breathing glow, listen page focus |
| `rgba(100, 130, 170, 0.25)` | Orbit active badge |

**Three distinct blue accent hues** (112,144,255 / 123,145,255 / 102,136,204 / 100,130,170) that should be one.

**Green accent (bird's-eye only):**
- `#4CAF50` — border, title text, box-shadow

**Zone legend colors:**
- `#64B5F6` (zone1), `#81C784` (zone2), `#FFB74D` (zone3), `#E57373` (zone4)

**Debug-only colors:**
- `#ffa500` (orange), `#00ff88` (green)

### Spacing inventory (padding/margin/gap, hardcoded non-clamp values)

| Value | Frequency | Examples |
|-------|-----------|---------|
| `0` | Many | Resets |
| `5px` | 1 | `.legend-item` gap |
| `6px` | 1 | `#inspect-side-badge` padding |
| `8px` | 8 | `.landing-read-more` margin, `.debug-row` margin, `.preview-card img` margin, various |
| `10px` | 7 | `.landing-panel .shell-kicker`, `.btn-skip` padding, `.inspect-controls-touch` gap |
| `12px` | 12 | `.preview-card` padding, `.subtitle` padding, `#inspect-prompt` padding/gap, various |
| `14px` | 3 | `#letter-preview` gap, `.inspect-panel` (768px) gap |
| `15px` | 3 | `.btn` padding, `#debug-panel` padding, `#bird-eye-indicator` padding |
| `16px` | 10 | `.shell-kicker` margin, `#inspect-prompt` padding, `.inspect-header` gap, various |
| `18px` | 2 | `.inspect-panel` gap |
| `20px` | 5 | `#debug-panel` top/left, `#mobile-pause-btn` top/right, `#loading-overlay` (768px) |
| `24px` | 7 | `#controls-hint` bottom/left, `#start-screen` padding, `#pause-screen` padding, inspect overlay padding |
| `25px` | 1 | `#bird-eye-indicator` padding |
| `28px` | 3 | `#letter-preview` right/bottom, inspect prompt bottom |
| `30px` | 2 | Touch joystick (480px) bottom/left |
| `32px` | 2 | `#start-screen` padding, `#pause-screen` padding |
| `40px` | 3 | `.btn` padding, joystick container bottom/left |
| `48px` | 0 (but appears in clamp ranges) | — |
| `50px` | 2 | `#mobile-pause-btn` size, touch action button position |
| `56px` | 0 (but appears in clamp ranges) | — |

**No consistent spacing scale.** Values jump unpredictably. A 4px-base scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 56) would normalize 90% of these.

### Border-radius inventory

| Value | Where |
|-------|-------|
| `50%` | Reticle, joystick base/knob, mobile buttons, legend dots |
| `999px` | `#inspect-prompt`, `#inspect-side-badge` (pill shapes) |
| `24px` | `.shell-panel` |
| `20px` | `.landing-panel`, `.shell-panel` (768px) |
| `18px` | `.subtitle`, `#inspect-scan-viewport`, `#inspect-orbit-viewport`, `#inspect-prompt` (768px) |
| `16px` | `.landing-panel` (480px) |
| `14px` | `#touch-deferred-status`, `#deferred-load-notice`, listen page buttons |
| `10px` | `#bird-eye-indicator`, `#inspect-scan-image` |
| `8px` | `.preview-card`, `#debug-panel` |
| `2px` | Progress bars |

**10 distinct radius values** — could normalize to 4–5 (small/medium/large/pill/circle).

### Backdrop-filter blur inventory

| Value | Where |
|-------|-------|
| `blur(18px)` | `.landing-panel`, `.shell-panel` |
| `blur(12px)` | `#touch-deferred-status`, `#deferred-load-notice` |
| `blur(10px)` | `.shell-panel-loading`, `#inspect-prompt` |
| `blur(8px)` | `.preview-card`, `.subtitle` |
| `blur(5px)` | `#start-screen`, `#pause-screen`, `#debug-panel`, `#mobile-pause-btn` |

**5 distinct blur values** — could normalize to 2–3 (light: 6px, medium: 12px, heavy: 18px).

### Z-index stack

| Z-index | Element | Purpose |
|---------|---------|---------|
| 4000 | `#webgl-fallback` | WebGL fallback screen |
| 3000 | `#landing-screen` | Landing overlay |
| 2000 | `#loading-screen` | Loading screen |
| 1500 | `#debug-panel` | Debug HUD |
| 1012 | `#inspect-overlay` | Inspect modal |
| 1010 | `#inspect-prompt` | Inspect CTA pill |
| 1001 | `#touch-action-btn`, `#mobile-pause-btn` | Floating buttons |
| 1000 | `#start-screen`, `#pause-screen`, `#touch-joystick-container`, `#touch-deferred-status` | Main UI layer |
| 999 | `#touch-look-area` | Touch look zone |
| 700 | `#deferred-load-notice` | Async notices |
| 600 | `#subtitle-container` | Subtitles |
| 500 | `#reticle`, `#bird-eye-indicator` | HUD elements |
| 100 | `#controls-hint`, `#letter-preview` | Hints/preview |
| 2 | `#loading-overlay` | Within loading screen |
| 1 | `#loading-scene-container` | 3D intro scene |
| 0 | (implicit) | Archive 3D canvas |

**Well-organized 16-tier stack.** No issues found.

### Breakpoints

| Query | Coverage |
|-------|----------|
| `@media (max-width: 768px)` | Tablet/large mobile |
| `@media (max-width: 480px)` | Small phones |
| `@media (prefers-reduced-motion: reduce)` | Motion sensitivity |
| `@media (hover: none) and (pointer: coarse)` | Touch device detection |

**Missing:** `1024px` (tablet landscape / small laptop), `1440px`+ (large desktop). The landing grid and start panel have no specific treatment for these intermediate and wide viewports.

### Transition/animation timing

**Transitions:**
- `0.05s ease-out` — Joystick knob, look hint transform
- `0.15s linear` — Listen page progress fill
- `0.2s ease` — Landing read-more, mobile pause, inspect buttons, deferred close
- `0.3s ease` — Buttons (all `.btn`), `.btn-skip`, letter preview, loading progress bar, listen page buttons
- `0.35s ease` — Landing panel expand
- `0.4s ease` — Deferred load notice
- `0.5s ease` — Look hint opacity
- `0.6s ease` — Landing screen opacity
- `0.8s ease` — Loading screen opacity

**Animations:**
- `landingFadeSlideIn` — 300–400ms ease-out, staggered 200–950ms delays
- `shellFadeSlideIn` — 150ms ease-out, staggered 500–1000ms delays
- `shellPanelReveal` — 400ms ease-out, 200ms delay
- `titlePulse` — 3s ease-in-out infinite (opacity 0.9↔1)
- `panelGlow` — 6s ease-in-out infinite (opacity 0.5↔1)
- `cta-breathe` — 3s ease-in-out infinite (box-shadow glow, delays 1.4–1.8s)
- `spin` — 1s linear infinite (legacy loader, hidden)

**Overall assessment:** Transition durations are reasonable (0.2–0.8s range). The `titlePulse` animation is very subtle (0.9↔1 opacity) — may be imperceptible.

---

### ui-ux-pro-max recommendations

**Design system match:** "Exaggerated Minimalism" — bold minimalism, oversized typography, high contrast, negative space. Performance: excellent. Accessibility: WCAG AA.

**Style match:** "Dark Mode (OLED)" — deep black #000000, dark grey #121212, midnight blue #0A0E27. Minimal glow effects, vibrant neon accents, high contrast text. WCAG AAA.

**Color palette match:** "E-commerce Luxury" pattern (closest to archival/dark tone) — primary #1C1917, secondary #44403C, CTA #CA8A04 (gold), dark background.

**Typography match:** "Academic/Archival" — EB Garamond + Crimson Text. "Editorial Classic" — Cormorant Garamond + Libre Baskerville. Both serif-focused for archival tone.

**Arabic typography match:** "Arabic Elegant" — Noto Naskh Arabic (traditional) + Noto Sans Arabic (modern UI). RTL support, excellent glyph coverage.

**Landing pattern match:** "Immersive/Interactive Experience" — full-screen interactive element, guided tour, skip option, dark background for focus. 40% higher engagement. Mobile fallback essential.

**UX guidelines:** Color contrast minimum 4.5:1 for normal text. Descriptive alt text. Focus states visible.

---

### Gap analysis

#### 1. Token coverage — hardcoded values that should be custom properties

| Missing token | Current hardcoded values | Suggested property |
|---------------|------------------------|--------------------|
| Text opacity levels | 14 distinct rgba(255,255,255,*) | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`, `--text-ghost` |
| Blue accent | 4 slightly different blue hues | `--accent-blue` (single RGB triplet) |
| Green accent | `#4CAF50` hardcoded in bird's-eye | `--accent-green` |
| Panel background (light) | Loading panel uses different gradient | `--shell-panel-bg-light` |
| Panel border (light) | `rgba(255,255,255,0.16)` used alongside 0.2 | `--shell-panel-border-light` |
| Focus ring color | `rgba(102,136,204,.7)` in listen page only | `--focus-ring` |
| Error/disabled | Hardcoded `opacity: 0.55` on `.btn:disabled` | `--disabled-opacity` |
| Spacing scale | All padding/gap values hardcoded | `--space-*` scale |
| Radius scale | 10 distinct values | `--radius-*` scale |
| Blur scale | 5 distinct values | `--blur-*` scale |
| Transition duration | Mix of 0.2s–0.8s | `--duration-fast`, `--duration-normal`, `--duration-slow` |

#### 2. Spacing scale

**Current state:** Ad-hoc. Values jump: 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 25, 28, 30, 32, 40, 50, 56px.

**Recommended 4px-base scale for this project:**

| Token | Value | Replaces |
|-------|-------|----------|
| `--space-1` | `4px` | — |
| `--space-2` | `8px` | 5px, 6px, 8px |
| `--space-3` | `12px` | 10px, 12px |
| `--space-4` | `16px` | 14px, 15px, 16px |
| `--space-5` | `20px` | 18px, 20px |
| `--space-6` | `24px` | 24px, 25px |
| `--space-8` | `32px` | 28px, 30px, 32px |
| `--space-10` | `40px` | 40px |
| `--space-12` | `48px` | 50px |
| `--space-14` | `56px` | 56px |

This would normalize ~18 ad-hoc values into 10 tokens.

#### 3. Type scale

**Current state:** 35+ distinct font sizes. No mathematical relationship.

**Recommended scale (preserving monospace/archival tone, based on 1.2 ratio):**

| Token | Value | Current values it replaces |
|-------|-------|---------------------------|
| `--text-xs` | `0.72rem` | 0.68, 0.7, 0.72, 0.74, 0.75, 0.76rem |
| `--text-sm` | `0.84rem` | 0.8, 0.82, 0.84, 0.85, 0.86rem |
| `--text-base` | `1rem` | 0.9, 0.92, 0.94, 0.95, 0.96, 1.0, 1.02, 1.05rem |
| `--text-lg` | `1.2rem` | 1.2rem |
| `--text-xl` | `1.5rem` | 1.5rem |
| `--text-2xl` | `2rem` | 1.8, 2.0rem |
| `--text-display` | `clamp(2.4rem, 5vw, 4.4rem)` | All clamp() display sizes |

This collapses 35+ sizes into 7 tokens, eliminating fractional rem noise while keeping the responsive clamp for display.

#### 4. Color system completeness

**Missing semantic tokens:**

| Token | Purpose | Suggested value |
|-------|---------|-----------------|
| `--text-primary` | Full-brightness text | `rgba(255,255,255, 1)` |
| `--text-secondary` | Body text | `rgba(255,255,255, 0.78)` |
| `--text-muted` | Labels, hints | `rgba(255,255,255, 0.62)` |
| `--text-faint` | De-emphasized | `rgba(255,255,255, 0.46)` |
| `--text-ghost` | Barely visible | `rgba(255,255,255, 0.28)` |
| `--border-default` | Standard borders | `rgba(255,255,255, 0.2)` |
| `--border-subtle` | Lighter borders | `rgba(255,255,255, 0.12)` |
| `--surface-glass` | Glass panel bg | current `--shell-panel-bg` |
| `--surface-overlay` | Screen overlays | `rgba(0,0,0, 0.6)` |
| `--accent-blue` | Interactive accent | `102, 136, 204` (single source) |
| `--focus-ring` | Focus indicator | `rgba(102,136,204, 0.7)` |

#### 5. Blur/glass consistency

**Current:** 5px, 8px, 10px, 12px, 18px — 5 distinct values with no clear hierarchy.

**Recommended 3-tier system:**

| Token | Value | Usage |
|-------|-------|-------|
| `--blur-light` | `6px` | Pause, debug, mobile pause, start screen |
| `--blur-medium` | `12px` | Status pills, deferred notices, inspect prompt, subtitles, previews |
| `--blur-heavy` | `18px` | Shell panels, landing panels |

#### 6. Breakpoint gaps

**Current coverage:**
- ≤480px — Small phones
- ≤768px — Tablets/large phones
- No coverage for 769–1023px, 1024–1439px, or 1440px+

**Impact:**
- **768–1024px (tablet landscape):** Landing grid shows as 2-column on tablet portrait (>768px) but with small panels. No adjustment for landscape orientation where height is limited.
- **1440px+ (large desktop):** Landing panels are capped at `max-width: 20rem`. On a 1440px+ screen, they float as small boxes with excessive empty space. The CTA area has no max-width constraint on its breathing glow spread.
- **4K / ultrawide / kiosk:** No viewport clamping. Content will appear very small relative to screen real estate. For exhibition kiosks, this is a concern.

**Recommended additions:**
- `@media (min-width: 1440px)` — Scale up panel sizes, increase grid gap, optionally cap viewport
- `@media (min-width: 1024px) and (max-height: 768px)` — Landscape tablet handling

#### 7. Arabic/bilingual typography

**Problem:** Courier New has severely limited Arabic glyph coverage. Arabic characters render with:
- Missing ligatures (Arabic is a connected script — isolated glyph forms look broken)
- Wrong proportions (monospace metrics destroy Arabic text rhythm)
- Missing diacritics and contextual forms
- Wide letter-spacing (0.42em on kickers) further fractures Arabic text

**Impact:** The exhibition listener page at `/listen/:id` shows Arabic text using `العربية` for the language button. When the page switches to Arabic (`dir="rtl"`), all text including kickers and labels renders in Courier New with no Arabic fallback.

**Options within the project's tone:**

| Option | Pros | Cons |
|--------|------|------|
| Add `Noto Naskh Arabic` as `[lang="ar"]` override | Proper Arabic rendering, elegant traditional style | Adds ~40KB font load, slightly different visual weight |
| Add `Noto Sans Arabic` as `[lang="ar"]` override | Clean modern Arabic, lighter weight | Doesn't match monospace archival tone as well |
| System Arabic fallback (`'Segoe UI', Arial, sans-serif`) | Zero additional load | Inconsistent across platforms, breaks monospace feel |

**Recommended:** `Noto Naskh Arabic` for Arabic content only, loaded conditionally. Also add `letter-spacing: normal` for `[lang="ar"]` contexts — Arabic text should never have expanded letter-spacing.

---

## Component Assessment

### 1. Landing screen grid + panels

**Source:** `index.html:14-42`, `main.css:48-216`

**Visual quality:** High. Glass panels with gradient background, subtle glow, 18px blur, elegant staggered reveal animation. 20px border-radius. The 4-panel + center CTA grid creates a deliberate museum-foyer composition.

**Touch targets:** Read-more buttons are inline text links with `padding: 0` — **fail** (no minimum touch area). CTA button is full-width `min(100%, 18rem)` — pass.

**Responsive:** At 768px, grid switches to flex column with center reordered to top. At 480px, padding tightens. **Gap:** No handling for wide desktops (>1440px) where panels float as small 20rem boxes in vast black space.

**Accessibility:** Panels have semantic `data-panel` attributes but no ARIA landmarks. Read-more buttons have `type="button"` (good) but no `aria-expanded` to convey expand state. The `.landing-panel-body` `max-height` expand is CSS-only with no ARIA coupling.

**Shell gating:** Correctly gated — `z-index: 3000`, hidden after CTA fade via JS.

**Tone:** Excellent. Dark, restrained, glass panels on black.

**Issues:**
- `landing-read-more` has zero padding (touch target fail) — `main.css:158`
- No `aria-expanded` on read-more toggle — `index.html:19`
- Two landing panels have placeholder text (`"Placeholder for the client's text..."`) — `landingContent.js:19,24`
- Wide-screen panels are very small relative to viewport — `main.css:114` (`max-width: 20rem`)

### 2. Landing center CTA block

**Source:** `index.html:26-30`, `main.css:74-108`

**Visual quality:** Good. Large clamp-sized title, restrained subtitle, breathing glow CTA. The `cta-breathe` animation provides a subtle pulse that draws attention without being aggressive.

**Touch targets:** CTA button `min-width: min(100%, 18rem)`, `padding: 15px 40px` — pass (well above 44px height).

**Responsive:** Title scales via clamp from 4.4rem to 1.5rem. Subtitle scales. Works well.

**Accessibility:** CTA is a `<button>` (good, not a link). No `aria-label` but button text "Enter the Archive" is descriptive.

**Tone:** Strong. The breathing glow on CTA is the only animation on the landing page — appropriately restrained.

**Issues:**
- No `<meta name="description">` for the page — `index.html` head

### 3. Landing read-more toggles

**Source:** `index.html:19`, `main.css:157-170`

**Visual quality:** Minimal — plain text link with uppercase styling. Fits the restrained tone.

**Touch targets:** **FAIL** — `padding: 0`, `font-size: 0.72rem`. The button has no padding or minimum height, making it nearly impossible to tap on mobile. This is a WCAG 2.5.8 violation.

**Responsive:** Text size stays at 0.72rem across all breakpoints — adequate.

**Accessibility:** No `aria-expanded` attribute to convey panel state. Screen readers cannot determine whether the panel is expanded or collapsed.

**Issues:**
- Zero-padding touch target — `main.css:159`
- Missing `aria-expanded` — `index.html:19,23,27,31`

### 4. Loading overlay

**Source:** `index.html:59-71`, `main.css:245-377`

**Visual quality:** High. The loading panel uses a lighter glass treatment (reduced opacity gradient, 10px blur) to not compete with the 3D scene behind it. Progress bar is a thin 2px glow line at the bottom. Title pulses subtly. The composition is bottom-left anchored.

**Touch targets:** Skip button at `padding: 10px 22px` — pass (above 44px total height). But skip button gets `pointer-events: auto` while the parent overlay is `pointer-events: none` — correct implementation.

**Responsive:** At 768px, loading overlay stretches full-width. At 480px, loading content fills 100% width. Works.

**Accessibility:** `#loading-status` has no `aria-live` attribute — dynamic loading messages won't be announced. The `#skip-intro-btn` is properly typed as `button`.

**Tone:** Excellent. The lighter glass panel over the 3D cinematic intro creates a film-title-card feel.

**Issues:**
- `#loading-status` should be `aria-live="polite"` — `index.html:65`
- Loading meta separator border uses hardcoded `rgba(255,255,255,0.14)` — `main.css:377`

### 5. Loading scene container

**Source:** `index.html:56`, `main.css:230-243`

**Visual quality:** The container itself is just a viewport for the Three.js loading scene. Styling is minimal (full-screen absolute, z-index 1).

**Issues:** None CSS-side. The 3D scene quality is a renderer concern outside this audit.

### 6. Start shell

**Source:** `index.html:75-103`, `main.css:411-548`

**Visual quality:** High. The start panel uses the standard glass treatment with a `panelGlow` breathing animation on the `::before` pseudo-element. Radial blue glow on the screen background. The start CTA has the same breathing glow as the landing CTA. Staggered reveal animation is elegant (panel scales in, then copy fades in sequence).

**Touch targets:** Start button — same as `.btn` (pass). No other interactive elements.

**Responsive:** Panel width is `min(34rem, calc(100vw - 48px))`. At 768px, h1 drops to 2rem. At 480px, h1 drops to 1.5rem. Lede constrained to `max-width: 24rem`. Works.

**Accessibility:** `#start-status` has `aria-live="polite"` (good). Start button is a proper `<button>`.

**Shell gating:** `z-index: 1000`. Shown only when `uiState === START` via `syncUiChrome()`.

**Tone:** Strong. Shares visual language with loading panel — coherent.

**Issues:**
- `.start-shell-primary` and `.start-shell-secondary` classes in HTML have **no corresponding CSS rules** — they exist as semantic containers only. This is not broken but is fragile — any future styling would need new rules. `index.html:77,88`
- The `.start-shell-detail` blocks have `hidden` attribute by default. `syncStartShellContent()` in main.js conditionally unhides them if copy exists. The secondary section (project/how-to/context blocks) may not appear if copy is empty, which it partially is — `startShellContent.js:5` (`project: ''`).

### 7. Pause overlay

**Source:** `index.html:106-110`, `main.css:551-598`

**Visual quality:** Low relative to other panels. Uses `rgba(0,0,0,0.6)` overlay with `blur(5px)` — much simpler than the glass panel system. No `::before` glow overlay. The "Paused" heading is plain uppercase text with `letter-spacing: 3px`. No panel container wrapping the content.

**Touch targets:** Resume button — same `.btn` class (pass).

**Responsive:** Heading drops to 1.5rem at 768px. Basic but functional.

**Accessibility:** `#pause-status` has `aria-live="polite"` (good).

**Tone:** Noticeably rougher than landing/loading/start panels. This screen feels like an afterthought compared to the polished shell panels elsewhere.

**Issues:**
- No glass panel treatment — inconsistent with landing/loading/start screens — `main.css:551-568`
- Copy is generic ("Resume when you are ready to return to the archive") — could carry more emotional weight — `index.html:108`
- `backdrop-filter: blur(5px)` is the weakest blur in the system — `main.css:567`
- No panel wrapping, no `::before` glow — visual quality mismatch with rest of shell system

### 8. Reticle

**Source:** `index.html:113`, `main.css:609-620`

**Visual quality:** Simple 6px white dot (4px at 768px). Appropriately minimal for an immersive first-person experience.

**Touch targets:** N/A — non-interactive, `pointer-events: none`.

**Tone:** Correct — small, unobtrusive, functional.

**Issues:** None.

### 9. Controls hint

**Source:** `index.html:114`, `main.css:622-632`

**Visual quality:** Plain text, bottom-left, 0.9rem, opacity 0.6. No background or panel treatment.

**Tone:** Appropriate — unobtrusive hint text that doesn't compete with the scene.

**Issues:**
- Hidden at 768px and on touch devices (correct behavior) — `main.css:1164, 1406`
- Text is hardcoded in HTML: `"WASD to Move • Mouse to Look • B: Bird's Eye View"` — `index.html:114`

### 10. Bird's-eye indicator

**Source:** `index.html:117-128`, `main.css:1416-1483`

**Visual quality:** Low. Uses bright `#4CAF50` green border, green text, and green glow — **visually disconnected** from the rest of the archive's restrained blue/white/black palette. Zone legend uses Material Design color names (`#64B5F6`, `#81C784`, `#FFB74D`, `#E57373`). Includes an emoji (`🦅`) in the title — only emoji in the entire project.

**Touch targets:** Non-interactive (`pointer-events: none`).

**Responsive:** At 768px, repositions with safe-area adjustments, removes centering transform. Adequate.

**Tone:** **Jarring mismatch.** The green/orange/red colors and emoji feel like a debug/development overlay, not part of the cinematic archive. This is the single largest visual inconsistency in the shell system.

**Issues:**
- Green accent color `#4CAF50` breaks the project palette — `main.css:1424,1436`
- Emoji `🦅` in title — `index.html:119`
- Zone coordinate ranges shown to users (`z: -60 to -55`) are implementation details, not meaningful to visitors — `index.html:123-127`
- Material Design zone colors don't match archive tone — `main.css:1469-1483`
- Already flagged in `15-ui-ux-reentry.md` as #1 issue: "Bird's-eye mode still feels like a tool overlay" — **known but deeper**

### 11. Mobile pause button

**Source:** `index.html:131`, `main.css:1099-1125`

**Visual quality:** Functional. 50px circle, semi-transparent black, 1px white border, 5px blur. Uses emoji `⏸` as icon.

**Touch targets:** 50px × 50px — **pass** (above 44px minimum).

**Responsive:** Fixed position with safe-area offsets. Correct.

**Tone:** Adequate. The emoji pause icon is the only non-SVG icon in the interactive UI, but acceptable for a control affordance.

**Issues:**
- Uses `display: none` as default, then `display: flex` on `:not([hidden])` — `main.css:1101, 1119-1121`. This works but is an unusual pattern.

### 12. Touch controls (joystick + look area)

**Source:** Created by `src/interaction/touchControls.js` (not in index.html), `main.css:1017-1072`

**Visual quality:** Functional but basic. Joystick is a 120px translucent white circle with a 50px draggable knob. Look area is an invisible 50% right-side overlay with a "LOOK AROUND" hint.

**Touch targets:** Joystick base 120px (100px at 480px), knob 50px (40px at 480px) — pass. Look area is 50% of viewport — pass.

**Responsive:** Joystick shrinks at 480px. Position adjusts with safe-area. Adequate.

**Tone:** Acceptable. Game-like controls are necessary for the 3D navigation. The translucent white treatment is consistent with the archive's palette.

**Issues:**
- Look hint text "LOOK AROUND" appears in the look area — `main.css:1065-1072`. Font styling matches but the text itself may not be visible enough at 0.4 opacity.

### 13. Letter preview cards

**Source:** `index.html:162-171`, `main.css:711-754`

**Visual quality:** Good. Dark glass cards with 8px blur, subtle borders, consistent with the archive tone. Smooth fade-in/slide-up transition on `.visible`.

**Touch targets:** Non-interactive (`pointer-events: none`).

**Responsive:** At 768px, cards reflow to centered horizontal row with safe-area bottom offset. At 480px, cards shrink to `min(42vw, 116px)`. Works.

**Tone:** Good — dark, functional, subordinate to the scene.

**Issues:**
- Already flagged in `15-ui-ux-reentry.md` as #3 issue ("Preview and subtitle layout... still scene-obstructive on smaller phones") — **known/confirmed**
- `img` elements have generic `alt="Front"` / `alt="Back"` — should include letter ID — `index.html:164,168`

### 14. Subtitle container

**Source:** `index.html:159`, `main.css:756-780`

**Visual quality:** Good. Centered pill with dark background (0.72 opacity), 18px radius, 8px blur, text shadow. Readable against the 3D scene.

**Touch targets:** Non-interactive (`pointer-events: none`).

**Responsive:** Width constrained to `min(62vw, 760px)` desktop, `min(88vw, 34rem)` at 768px. Bottom position adjusts at each breakpoint. Works.

**Tone:** Appropriate — cinematic subtitle presentation.

**Issues:**
- Already flagged in `15-ui-ux-reentry.md` as #2 and #3 issues (generic fallback copy, mobile obstruction) — **known/confirmed**
- `aria-live="polite"` and `aria-atomic="true"` on the container — correct for dynamic content

### 15. Inspect overlay

**Source:** `index.html:178-222`, `main.css:782-973`

**Visual quality:** High. Full-screen glass panel with gradient background, scan viewport with dark border and inner glow, orbit viewport with near-black background. Side badge is a pill with subtle border. Touch controls row is well-organized.

**Touch targets:** Inspect buttons at `padding: 10px 18px` → estimated ~36px height — borderline. At 480px, padding drops to `9px 12px` → estimated ~32px — **fail** (below 44px minimum). The header exit button is `28px × 28px` (from `.inspect-header-exit-btn`) — **fail**.

**Responsive:** At 768px, panel fills 100% width, header stacks vertically, viewports shrink to `min(56vh, 620px)`. At 480px, viewports shrink to `min(50vh, 520px)`, padding reduces. Generally works but density is high on small screens.

**Accessibility:** `#inspect-overlay` has `aria-live="polite"` and `aria-atomic="true"`. Inspect touch buttons have proper `type="button"`. Desktop keyboard shortcuts documented in visible text. Orbit viewport has `role="img"` and `aria-label`.

**Tone:** Excellent — the scan viewport with dark border and inner radial glow feels like examining a document in a museum lightbox.

**Issues:**
- Touch button heights fall below 44px minimum at 480px — `main.css:1380-1384`
- Exit button at 28px is too small for touch — needs min 44px or tap area expansion — `index.html:189-195`
- No visible focus styles specific to inspect buttons (inherits from `.btn` which has no `:focus-visible` rule) — `main.css:577-598`

### 16. Exhibition listener page

**Source:** `public/listen/index.html` (508 lines, ~12KB standalone)

**Visual quality:** Excellent. Perfectly matches the archive's design language — same monospace font, same dark background, same glass button treatment, same blue glow accent, same staggered fade-slide-in animation. Progress bar uses the archive's zone glow color. Layout is centered single-column with consistent `max-width: 380px`.

**Touch targets:** Play button 72px × 72px (excellent). Language buttons `min-height: 52px` (pass). Progress bar is 3px height — **fail for scrubbing precision** (should have a taller hit area, ~20px invisible padding around the 3px visual bar).

**Responsive:** Mobile-first with clamp() scaling. Single max-width prevents ultra-wide issues. Safe-area padding implemented.

**Accessibility:**
- Language nav has `role="group"` and `aria-label` — good, though `role="radiogroup"` would be more precise since the buttons are mutually exclusive.
- Progress bar has proper `role="progressbar"` with `aria-valuemin/max/now`.
- Play button `aria-label` updates dynamically ("Play" ↔ "Pause") — good.
- **FAIL:** Progress bar is not keyboard-navigable (no `tabindex`, no arrow key handling). Users cannot seek audio via keyboard.
- **FAIL:** `user-scalable=no` and `maximum-scale=1.0` in viewport meta — WCAG 1.4.4 violation. Low-vision users cannot zoom.
- No `aria-live` region for status messages — "Loading" and "Audio not yet available" won't be announced to screen readers.

**Arabic/RTL:**
- `document.documentElement.lang` and `dir` switch correctly on language toggle.
- RTL-aware progress bar click handler (flips ratio calculation) — correctly implemented.
- **FAIL:** Arabic text renders in Courier New with no Arabic font fallback — glyphs are broken, ligatures missing, contextual forms absent.
- **FAIL:** `letter-spacing: 0.42em` on kicker text stays active in Arabic — Arabic text should never have expanded letter-spacing.

**Offline handling:** Audio `error` event shows "Audio not yet available" and disables play. No retry mechanism. No distinction between 404 and network error. No indication of connectivity issues.

**Tone:** Excellent visual cohesion with the main archive.

**Issues:**
- Arabic font rendering broken (Courier New) — `listen/index.html:18`
- Arabic letter-spacing too wide — `listen/index.html:48-49`
- Progress bar not keyboard-accessible — `listen/index.html:363`
- `user-scalable=no` WCAG violation — `listen/index.html:5`
- No audio retry mechanism — `listen/index.html:437-447`
- Only 3 of 10 papers have MP3 files (papers 4-10 show error) — asset gap, not a code issue
- Error state animation cleanup creates a `<style>` tag per error — minor DOM pollution — `listen/index.html:442-445`

---

## Meta / OG / Favicon Audit

### index.html

| Tag | Present? | Value |
|-----|----------|-------|
| `<title>` | ✅ | "House of Dreams" |
| `<meta name="description">` | ❌ | Missing |
| `<meta property="og:title">` | ❌ | Missing |
| `<meta property="og:description">` | ❌ | Missing |
| `<meta property="og:image">` | ❌ | Missing |
| `<meta property="og:url">` | ❌ | Missing |
| `<meta property="og:type">` | ❌ | Missing |
| `<meta name="twitter:card">` | ❌ | Missing |
| `<link rel="icon">` | ❌ | Missing |
| `<link rel="apple-touch-icon">` | ❌ | Missing |
| `manifest.json` / `site.webmanifest` | ❌ | Missing |
| `favicon.ico` | ❌ | Not in `public/` |

### public/listen/index.html

| Tag | Present? | Value |
|-----|----------|-------|
| `<title>` | ✅ | "House of Dreams — Exhibition Audio" |
| `<meta name="theme-color">` | ✅ | `#000000` |
| All OG/social tags | ❌ | Missing |
| All favicon tags | ❌ | Missing |

**Impact:** When someone shares the production URL (`houseofdreams.space`) on WhatsApp, Telegram, Twitter/X, or Facebook, there will be:
- No preview image
- No description text
- No favicon in browser tabs or bookmarks
- Generic/missing card when shared

For an exhibition-bound project, this is a significant gap. Exhibition visitors who share the URL or save it will see a blank preview.

---

## Performance Profile

### Font strategy

**Current:** System-installed Courier New. Zero font loading, zero FOIT/FOUT.

**Tradeoff:** Courier New is available on all platforms, so text renders instantly. However:
- Arabic glyph coverage is severely limited (see Component 16)
- Courier New's metrics are wide — on small screens, text consumes more horizontal space than proportional fonts
- No web font download means faster first paint

**Recommendation:** Keep Courier New as primary for Latin text. Add Noto Naskh Arabic (loaded only when `lang="ar"` is active) for Arabic contexts on the listen page.

### Asset loading architecture

From `src/main.js` and `src/config/constants.js`:
- **Staged loading:** Zones 1-2 are "core" (gate entry), zones 3-4 load after archive entry via `startDeferredLetterLoad()` on `setTimeout(0)` to avoid blocking the main thread.
- **Timeout:** `LOADING_TIMEOUT_MS = 600000` (10 minutes) — generous for slow gallery WiFi.
- **Retries:** `LOADING_RETRY.MAX_RETRIES = 3`, `RETRY_DELAY_MS = 2000`.
- **Assets per letter:** 1 GLB model + 2 JPG scans (front/back) + 1 MP3 narration (lazy-loaded on proximity).
- **46 letters total:** 22 core + 24 deferred.

**Perceived performance:** Users see the loading intro (3D cinematic) while assets load. The start screen appears only after core assets finish. This is good — users are not staring at a blank screen.

### Bundle composition

From `vite.config.js`:
- `manualChunks: { three: ['three'] }` — Three.js is split into its own chunk.
- Known build warning: chunk exceeds 500KB after minification (the `three` chunk).
- Other code is a single entry bundle from `src/main.js`.
- No dynamic imports or route-based code splitting (single-page app).

Dependencies: `three` (large), `howler` (small), `postprocessing` (medium), `vite-plugin-glsl` (build-only).

### Renderer budget

From `src/config/constants.js`:
- Immersive pixel ratio cap: 1.5 (`RENDERER_QUALITY.IMMERSIVE_PIXEL_RATIO_MAX`)
- Inspect pixel ratio cap: 2.0 (`RENDERER_QUALITY.INSPECT_PIXEL_RATIO_MAX`)
- Post-processing: bloom (intensity 0.3, threshold 0.6) + vignette (darkness 0.4) — lightweight
- Loading scene: separate renderer with its own heavier post-processing (described in `loadingScene.js`)

### Animation frame budget

From `src/main.js:2025-2144`, the `animate()` function per frame:
1. `clock.getDelta()` + `clock.getElapsedTime()` — trivial
2. View mode check — trivial
3. `updateControls(delta)` — movement math
4. Debug display updates — DOM reads/writes (2 `.textContent` sets)
5. `updateInspectTransition(delta)` — camera lerp when entering/exiting inspect
6. Debug position display — 1 `.textContent` set
7. Proximity update (`proximityManager.update()`) — candidate/active scoring across loaded letters
8. `updateActiveLetterUI()` — DOM updates for preview/subtitle
9. Narration volume computation — distance-based math + Howler API call
10. `syncInspectUi()` — DOM visibility toggles
11. `groundTimeline.update()` — mesh opacity/position updates for floor chronology
12. Letter animation loop — `forEach` over all loaded letters within animation radius (15 units), computing sin-based rotation/position (3 sin calls per visible letter)
13. `updateAtmosphere()` — zone-based color lerp
14. `updateDust()` — particle position updates for 500 dust particles
15. `composer.render(delta)` — Three.js post-processing render

**Assessment:** The frame budget is moderate. The letter animation loop (item 12) skips distant letters via distance-squared check — good optimization. The dust update (item 14) iterates 500 particles — acceptable. DOM writes in items 4, 6, 8, 10 happen every frame but are minimal (textContent sets, not layout-triggering).

**Potential concern:** `syncInspectUi()` is called every frame (item 10), which reads multiple DOM properties. If this includes hidden state checks, it may trigger style recalculation. Would need profiling to confirm.

### CSS performance

- `main.css` (1579 lines) loaded synchronously via `<link>` in `<head>` — blocks first paint.
- `[hidden] { display: none !important }` rule ensures hidden elements don't contribute to layout — good.
- `backdrop-filter: blur()` is GPU-composited on modern browsers — multiple blur layers may cause GPU memory pressure on low-end mobile.
- `body { position: fixed }` prevents body scroll — correct for a full-screen app.
- No `will-change` declarations — acceptable since most animations use `transform` and `opacity` which are already composited.

### Listen page weight

- ~12KB total (HTML + inline CSS + inline JS).
- No external dependencies except audio MP3s.
- Zero font downloads (system Courier New).
- No images.
- **Excellent for QR-code-driven mobile flow** — should load in under 1 second on 3G.

---

## Exhibition-Specific Concerns

### Large screen / kiosk display

**Issue:** No max-width constraint on the main viewport. At 4K (3840px) or ultrawide:
- Landing panels (max-width: 20rem = 320px) will be tiny relative to screen
- The 2-column grid will have massive gaps
- Reticle (6px dot) will be nearly invisible
- Font sizes are rem-based, so text scales with browser defaults — acceptable, but the overall composition will feel sparse

**Recommendation:** Consider a `@media (min-width: 1920px)` query that increases base font size or adds a viewport wrapper with `max-width: 1440px` centered.

### QR code flow

**Flow:** Scan QR → browser opens `houseofdreams.space/listen?p=1` → page loads (~12KB) → user selects language → plays audio.

**Assessment:**
- Page weight is excellent for mobile/WiFi flow
- Language selection is the first interaction — clear and prominent
- Audio loading indicator ("Loading...") appears immediately
- Error handling shows "Audio not yet available" if MP3 is missing

**Concerns:**
- No offline support or service worker — if WiFi drops during playback, audio stops with no recovery
- No "return to full experience" link from the listen page to the main archive
- Paper ID validation rejects non-numeric or out-of-range IDs but shows a generic "?" error — no guidance on what went wrong

### First 5 seconds (landing page)

**Sequence:**
1. Black screen (CSS loads, JS initializes)
2. `.landing-revealed` class triggers staggered fade-in: center block at 200ms, then panels at 500ms, 650ms, 800ms, 950ms
3. CTA breathing glow starts at 1.8s delay

**Assessment:** The staggered reveal is well-timed — users see the title and CTA within 300ms, then context panels fill in. The black background provides an instant "this is intentional" signal rather than a broken-looking white flash.

**Concern:** The subtitle "An interactive archive of 105 prison papers" appears immediately below the title. This is the only orientation text before the CTA. It communicates content but not interaction expectation — users don't know they'll need to navigate a 3D space until the start screen.

### Gallery WiFi

**Strategy:** Staged loading means the archive can reach the start screen with only zone 1-2 assets. Zone 3-4 loads in background. If deferred loading fails or degrades, the session continues with partial content and minimal status indicators.

**Audio:** Narration loads lazily on proximity (not upfront). Theme audio buffers as soon as AudioContext is unlocked.

**Assessment:** The loading architecture is well-designed for slow networks. The 10-minute timeout is generous. The retry logic (3 attempts, 2s delay) handles intermittent drops.

**Concern:** The loading intro (3D cinematic scene) itself requires WebGL rendering — on very old gallery devices, this may be slow or fail entirely. The WebGL fallback message exists (`#webgl-fallback`) but is basic.

---

## Cross-Reference Summary

### Known/confirmed (already documented, this session confirms)

1. Bird's-eye mode feels like a debug overlay (#1 in `15-ui-ux-reentry.md`) — **confirmed: green accent, emoji, zone coordinates, Material Design colors all contribute** — `main.css:1416-1483`
2. Subtitle fallback copy is generic (#2 in `15-ui-ux-reentry.md`) — **confirmed via `startShellContent.js` and `landingContent.js`**
3. Preview/subtitle layout obstructive on small phones (#3 in `15-ui-ux-reentry.md`) — **confirmed via CSS analysis of stacked fixed-position elements with multiple safe-area offsets**
4. Shell copy under-orients first-time users (#4 in `15-ui-ux-reentry.md`) — **confirmed: start lede is "The archive is ready." — no preview of the interaction model**
5. Debug UI depends on runtime flag (#5 in `15-ui-ux-reentry.md`) — **confirmed via `body.debug-enabled` CSS selector** — `main.css:706-709`
6. Overlay regression risk (#6 in `15-ui-ux-reentry.md`) — **confirmed: the DOM/CSS complexity is real, with 14+ overlapping fixed/absolute positioned elements**

### Known but deeper (documented, but code analysis reveals more)

1. **Bird's-eye visual mismatch is worse than documented.** Beyond "feels like a debug overlay," the indicator uses a completely different color system (#4CAF50 green + Material Design zone colors), includes the only emoji in the project (`🦅`), and exposes raw z-coordinates to users. The visual break is not just stylistic — it's a tonal rupture in a memorial project. — `main.css:1416-1483`, `index.html:117-128`

2. **Pause screen is the weakest shell panel.** `15-ui-ux-reentry.md` notes "pause messaging is clearer" after prior work, but the pause screen is the only full-screen shell state that doesn't use the glass panel system. It uses `rgba(0,0,0,0.6)` with `blur(5px)` — the lightest treatment in the system. Compared to the polished loading/start panels, it feels unfinished. — `main.css:551-568`

3. **Arabic typography problem is more severe than implied.** The listen page audit in memory flags "Arabic font fallback missing" but the actual impact is broken ligatures, missing contextual forms, and illegible text — not just a font preference issue. Combined with `letter-spacing: 0.42em` on Arabic kickers, Arabic content is functionally unreadable. — `listen/index.html:18,48-49`

4. **Touch target failures are scattered.** Multiple components fail the 44px minimum: landing read-more (zero padding), inspect buttons at 480px (~32px), inspect exit button (28px), deferred notice close (28px). This wasn't called out as a pattern in existing docs. — `main.css:158-159, 1380-1384, 1557-1562`

### Net-new findings (not in any existing doc)

1. **No OG tags, no favicon, no social sharing metadata on either HTML entry point.** When the exhibition URL is shared on messaging apps, there's no preview image, no description, no icon. For an exhibition-bound project, this is a critical gap. — `index.html` head, `listen/index.html` head

2. **`user-scalable=no` on both HTML files is a WCAG 1.4.4 violation.** Low-vision users cannot zoom. — `index.html:4`, `listen/index.html:5`

3. **`--overlay-bg` custom property is declared but never referenced in main.css.** Dead token. — `main.css:4`

4. **14 distinct white opacity levels with no semantic naming.** The same white-on-black with slightly different opacities appears throughout without any consistent meaning. 0.78 and 0.82 may be interchangeable; 0.54 and 0.56 almost certainly are. — scattered throughout `main.css`

5. **Three distinct blue accent hues** (112,144,255 / 123,145,255 / 102,136,204 / 100,130,170) should be one. — `main.css` various locations

6. **`.start-shell-primary` and `.start-shell-secondary` have no CSS rules.** They exist in HTML but serve as unstyled semantic containers only. Fragile for future maintenance. — `index.html:77,88`

7. **`#loading-status` lacks `aria-live`.** Dynamic loading messages ("Entering the archive...", "Loading letters...") won't be announced to screen readers. — `index.html:65`

8. **Landing read-more buttons lack `aria-expanded`.** Screen readers cannot determine panel expand state. — `index.html:19,23,27,31`

9. **Two landing panels have placeholder copy.** "The Party" and "The Papers" panels say "Placeholder for the client's text..." — these will be visible to exhibition visitors if not replaced. — `landingContent.js:19,24`

10. **Listen page progress bar is not keyboard-accessible.** Cannot seek audio without a pointer device. — `listen/index.html:363`

11. **No `<meta name="description">` on either page.** Search engines and link previews will have no summary text. — `index.html`, `listen/index.html`

12. **No link from listen page back to main archive.** Exhibition visitors who discover the listen page have no navigation path to the full 3D experience. — `listen/index.html`

13. **Listen page error state creates a `<style>` element per error** to remove the ellipsis animation. If the page is reused across tabs or sessions, this leaks DOM nodes. — `listen/index.html:442-445`

14. **No `1024px` or `1440px+` breakpoint.** The landing grid and shell panels have no treatment for tablet landscape or large desktop/kiosk displays. On wide screens, 20rem panels float in vast black space. — `main.css` breakpoint section

15. **`btn` base class has no `:focus-visible` rule.** Keyboard users see no focus indicator on primary buttons (CTA, resume, start). Only the listen page has explicit `:focus-visible` styles. — `main.css:577-598`

---

## Preliminary Severity Classification

### Critical (blocks exhibition readiness)

1. **Two landing panels have placeholder copy** — visitors will see "Placeholder for the client's text..." — `landingContent.js:19,24`
2. **No OG tags / social metadata / favicon** — shared exhibition URLs have no preview — `index.html`, `listen/index.html`
3. **Arabic text unreadable on listen page** — Courier New cannot render Arabic properly; letter-spacing worsens it — `listen/index.html:18,48-49`

### High (meaningfully degrades experience)

4. **`user-scalable=no` WCAG violation** on both pages — locks out low-vision users — `index.html:4`, `listen/index.html:5`
5. **Bird's-eye indicator visual mismatch** — green accent, emoji, zone coordinates break the memorial tone — `main.css:1416-1483`, `index.html:117-128`
6. **Pause screen lacks glass panel treatment** — visually rougher than all other shell states — `main.css:551-568`
7. **Landing read-more zero-padding touch targets** — impossible to tap on mobile — `main.css:158-159`
8. **No `:focus-visible` on primary buttons** — keyboard users see no focus indicator — `main.css:577-598`
9. **Inspect buttons below 44px at 480px** — touch target failure on small phones — `main.css:1380-1384`
10. **Listen page progress bar not keyboard-accessible** — cannot seek audio without pointer — `listen/index.html:363`

### Medium (polish that raises quality)

11. **14 distinct white opacity levels** — should collapse to 4-5 semantic tokens — `main.css` throughout
12. **35+ ad-hoc font sizes** — should normalize to a 7-step type scale — `main.css` throughout
13. **3 distinct blue accent hues** — should unify to one — `main.css` various
14. **5 distinct blur values** — should normalize to 3-tier system — `main.css` various
15. **No spacing scale** — 18+ ad-hoc pixel values — `main.css` throughout
16. **Missing `aria-live` on `#loading-status`** — screen reader gap — `index.html:65`
17. **Missing `aria-expanded` on landing read-more** — screen reader gap — `index.html:19,23,27,31`
18. **No breakpoint for 1024px or 1440px+** — composition gaps on large screens — `main.css`
19. **No link from listen page to main archive** — dead-end exhibition path — `listen/index.html`
20. **Deferred notice close button at 28px** — below 44px touch target — `main.css:1557-1562`

### Low (nice-to-have refinements)

21. **Dead token `--overlay-bg`** — declared but unused — `main.css:4`
22. **`.start-shell-primary/secondary` unstyled** — fragile for future work — `index.html:77,88`
23. **Listen page error creates `<style>` per error** — minor DOM leak — `listen/index.html:442-445`
24. **`titlePulse` animation barely perceptible** (0.9↔1.0 opacity) — may not justify the animation cost — `main.css:341-344`
25. **Mixed `em`/`px` units for letter-spacing** — consistency issue — `main.css` various
26. **Start shell lede copy is generic** ("The archive is ready.") — missed opportunity for emotional preparation — `startShellContent.js:4`
27. **No audio retry mechanism on listen page** — exhibition visitors on flaky WiFi get stuck — `listen/index.html:437-447`
28. **Listen page language buttons use `role="group"` instead of `role="radiogroup"`** — semantic precision — `listen/index.html:354`
