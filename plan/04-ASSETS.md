# 04-ASSETS — Visual asset production spec (Higgsfield + code)

## 1. Global style lock (append to EVERY image/video prompt, verbatim)
`Style: single-weight thin line art (1.5px feel), deep violet #6D4AFF accents on warm off-white #FAF9F7 background, flat 2D vector illustration, soft rounded corners, generous negative space, no gradients, no shadows, no realistic elements, no people, no letters or readable text of any kind, modern minimal tech product aesthetic.`
Rules: generate the full set in ONE session; regenerate outliers rather than mixing styles; dark-mode variants = same asset with bg #0F0D17 / lines #EFEDF6 (invert, keep violet).

## 2. Logo (Higgsfield nano_banana_pro, 1:1)
- **L1 — 4 concepts:** `Minimalist flat vector logo mark for a developer tool named 'gitbrief'. A single bold abstract solid shape: a modern geometric lowercase letter b whose inner counter space is formed by two or three short horizontal text lines, so the mark reads simultaneously as the letter b and as a briefing document with lines of text. Soft rounded corners, smooth continuous curves, style of modern minimal tech brand marks (Span, Linear, Vercel era). Exactly two colors: deep violet #6D4AFF solid mark centered on warm off-white #FAF9F7 rounded-square app icon squircle. No gradients, no outlines, no words, generous negative space, perfectly centered, flat 2D vector, crisp, brandable, extremely simple.`
- **L2 — refinement:** pick winner → re-generate ×2 with `refine: cleaner geometry, optically corrected curves, tighter negative space` → dark inverse (`off-white #FAF9F7 mark on deep violet-black #0F0D17 squircle`) → `upscale_image` 4K master.
- **Post-process (code, not AI):** manually trace winner to SVG (the shipped logo is ALWAYS the SVG, AI raster is reference only). Deliver: `logo.svg`, `logo-dark.svg`, `favicon.ico` (32/16), `apple-touch-icon.png` 180, `icon-512.png`.
- Wordmark: `gitbrief` set in Space Grotesk 500, tracking -0.01em, mark-to-wordmark gap = 0.6× mark width. Lowercase always.

## 3. Illustrations (nano_banana_pro, 1:1, count 2 each, pick best)
- **I2 step-02 still:** `A minimalist line-art file tree diagram of a software repository, a horizontal scan line passing across it, two document icons glowing softly in violet as the scan touches them, three small abstract version-tag shapes popping beside them.` + style lock.
- **I3 step-03 still:** `Three minimalist line-art document pages folding and stacking into a single neat bundle tied with one violet line, a circular check badge appearing at the corner.` + style lock.
- **I4 empty-state:** `A minimalist line-art magnifying glass hovering over an empty folder outline, one small violet question-mark-shaped abstract squiggle (not a real character), calm and friendly.` + style lock.
- **I5 404:** `A single minimalist line-art briefing document with a gently torn top corner, the torn piece floating away, one violet accent line across the page.` + style lock.
- **O1 OG fallback (16:9, crop 1200×630):** `A wide abstract composition of a fine line grid with one violet pulse traveling along the lines like data, a subtle briefing-document outline right of center, large clear empty space on the left third for a wordmark overlay.` + style lock. (Wordmark overlaid in code, never AI-rendered.)
Mount: `public/assets/illus/{i2,i3,i4,i5}.webp` (+`-dark`), `public/assets/og-fallback.png`.

## 4. How-it-works animations — SVG/Framer Motion (PRIMARY implementation, ship this)
Shared: 320×200 viewBox, `stroke: currentColor` 1.5px, round caps/joins, violet = `var(--primary)`, loop 5s with 1s rest, `prefers-reduced-motion` → final frame static. Build as three React components in `components/landing/anim/`.
- **A2 `PasteAnim`:** browser frame draws in (pathLength 0→1, 600ms) → cursor glides to address bar (motion path, 500ms) → bar border tints violet → mono text types `github.com/owner/repo` char-by-char (45ms/char, REAL text — the reason we code this) → enter key glyph pulses → violet ring radiates (scale 1→1.4, opacity→0, 500ms).
- **A3 `ReadAnim`:** 8-line file tree draws in staggered → vertical scan line sweeps left→right (1.2s, ease-in-out) → `package.json` & lockfile rows glow violet as touched → three version chips (`next 15` `tw 4.1` `sb 2.48`, real text 9px mono) pop (scale 0.8→1 spring) above.
- **A4 `BriefAnim`:** three page outlines slide from corners to center stack (staggered 120ms) → stack compresses to single bundle card → violet tie-line draws around it (pathLength, 400ms) → check badge scales in (spring) → gentle idle float ±2px.
- **A1 hero-ambient (results loading reuse):** already specced as the grid pulse in 01 §4.1 — no separate asset.

## 5. Higgsfield video versions (OPTIONAL polish — social posts + section swap if plan tier active)
kling3_0_turbo, 16:9, 5s, one per scene. Prompts = §4 scene descriptions rewritten cinematically + style lock + `abstract short dash segments instead of any typed text, no letters anywhere` + `smooth eased motion, seamless loop feeling`. A2 video prompt (reference, others analogous): `Flat 2D minimalist line-art motion graphics: a clean browser window drawn in thin dark strokes scales into frame on off-white, an elegant cursor glides to the address bar which tints violet, abstract short dashes appear one by one as if a URL is typed, the cursor presses enter and a soft violet pulse radiates.` + style lock. Acceptance: stroke weight consistent, palette exact, no glyph artifacts; else regenerate (max 2 attempts) or keep SVG.

## 6. Tech icons & UI icons — zero generation
Lucide (UI, 1.5px) + simple-icons via `@icons-pack/react-simple-icons` (tech marks), rendered monochrome `--muted-foreground`, `--primary` on hover; map `technologies.icon_ref` → component; missing icon → fallback rounded square with 2-letter mono initials. Never multicolor.

## 7. Asset checklist
`logo.svg + dark + favicons` □ · `i2..i5 webp ×2 modes` □ · `og-fallback.png` □ · `A2 A3 A4 components` □ (ship-blocking) · Higgsfield videos □ (non-blocking) · social launch card (score-card template, gitbrief/gitbrief repo, score 100 — the joke IS the marketing) □.
