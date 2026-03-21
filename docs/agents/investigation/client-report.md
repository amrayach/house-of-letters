# House of Dreams — Pre-Exhibition Review

*Prepared March 21, 2026*

---

## Summary

We conducted a thorough review of the House of Dreams digital archive ahead of the exhibition. The review covered the main 3D experience, the exhibition audio listener page, and how the site appears when shared on social media or messaging apps.

**The good news:** The visual design and user experience of the core archive are strong. The dark, cinematic presentation — glass panels, staggered reveal animations, and restrained palette — creates a museum-quality digital space that respects the weight of the source material. The audio listener page (for QR code scanning at the exhibition) is fast, clean, and visually cohesive with the main experience.

**What needs attention before the exhibition:** A handful of practical items that affect how visitors discover, share, and access the project.

---

## What Visitors Will See

### The Landing Page

When visitors first open the site, they see the title "House of Dreams" centered on a black screen, with four glass panels in the corners providing context about the project, Ahed, the party, and the papers. The design is elegant and intentional.

**Two panels currently show placeholder text.** The bottom-left ("The Party") and bottom-right ("The Papers") panels display: *"Placeholder for the client's text about..."* This is visible to visitors without any interaction — they don't need to click anything to see it.

**We need the final text for these two panels** to replace the placeholders before the exhibition opens.

### The Audio Listener (QR Code Page)

When exhibition visitors scan a QR code next to a diary paper, their phone opens a simple audio page where they choose Arabic or English and press play. This page:

- Loads in under 300 milliseconds — excellent for gallery WiFi
- Weighs only 4 kilobytes — works even on slow connections
- Matches the visual style of the main archive perfectly

**Papers 1, 2, and 3 have working audio.** Papers 4 through 10 show "Audio not yet available." **We need the remaining MP3 files** (Arabic and English for each paper) to complete the audio guide.

---

## What Happens When Someone Shares the Link

Currently, when someone shares `houseofdreams.space` on WhatsApp, Telegram, Instagram, Twitter, or Facebook, the preview shows:

- No image
- No description
- No icon

This is because the site is missing social media metadata (Open Graph tags) and a favicon. **This is the single most impactful fix we need to make** — exhibition visitors will share this link, and right now it looks blank when they do.

We will add the metadata. To make the preview look good, we need:

- **A preview image** — ideally a still from the 3D experience or a photograph of one of the papers. Recommended size: 1200 x 630 pixels. This is what appears as the thumbnail when someone shares the link.
- **A short description** — one or two sentences that appear below the title in link previews. Suggestion: *"An interactive archive of 105 prison papers written by Ahed Sheikh Hassan during his detention in Syrian prisons, 1987-1994."* (We can use the existing subtitle, or the client can provide something different.)

---

## Items We Need From You

| Item | What we need | Why it matters |
|------|-------------|---------------|
| **"The Party" panel text** | Final copy about the political context | Currently shows placeholder text visible to all visitors |
| **"The Papers" panel text** | Final copy about how the papers were preserved and smuggled | Same — placeholder visible to visitors |
| **Audio files for papers 4-10** | MP3 files in Arabic and English (20 files total: `4_ar.mp3`, `4_en.mp3`, ... `10_ar.mp3`, `10_en.mp3`) | Exhibition audio guide shows "not yet available" for these papers |
| **Social preview image** | One image, 1200x630px, representing the project | For link previews when the URL is shared on messaging apps and social media |
| **Description text** (optional) | 1-2 sentences for social media previews | Will use existing subtitle if not provided |

---

## What We Will Fix (No Content Needed From You)

These are technical improvements we will make before the exhibition:

1. **Social sharing setup** — Add all the metadata so the link looks good when shared
2. **Accessibility improvements** — Allow pinch-to-zoom for visitors with low vision, add keyboard navigation to the audio player, make buttons easier to tap on small phones
3. **Visual consistency** — Bring the pause screen and navigation overview up to the same polish level as the landing and start screens
4. **Large screen support** — Make the landing page look intentional on exhibition kiosk displays and large monitors

---

## Exhibition Readiness

| Area | Status |
|------|--------|
| 3D archive experience | Ready — strong visual design, good performance |
| Audio listener (QR page) | Ready for papers 1-3, awaiting audio for 4-10 |
| Landing page copy | Awaiting final text for 2 of 4 panels |
| Social sharing / link previews | Not ready — needs OG tags + preview image |
| Mobile experience | Good — responsive, fast loading |
| Accessibility compliance | Needs targeted fixes (in progress) |

---

## Timeline

Once we receive the content items listed above, integrating them is straightforward — each is a matter of hours, not days. The technical fixes on our side can proceed in parallel.

The audio files and panel text are the only items that block exhibition completeness. The social sharing fix (OG tags + preview image) is the highest-impact improvement for post-exhibition reach.
