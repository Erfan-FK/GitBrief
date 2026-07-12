# Generated assets — Higgsfield production log (04-ASSETS swap-in)

Generated 2026-07-12 in ONE session with the identical style lock (04 §1),
per the spec rule. All prompts recorded verbatim for reproducibility.
Model: `nano_banana_pro` (served as nano_banana_2) for images,
`kling3_0_turbo` 5s 16:9 720p for videos, `bytedance` 4K upscale.

**Style lock appended to every prompt (04 §1, verbatim):**
> Style: single-weight thin line art (1.5px feel), deep violet #6D4AFF
> accents on warm off-white #FAF9F7 background, flat 2D vector illustration,
> soft rounded corners, generous negative space, no gradients, no shadows,
> no realistic elements, no people, no letters or readable text of any kind,
> modern minimal tech product aesthetic.

## L1/L2 — Logo

| Step | Job id | Outcome |
|---|---|---|
| L1 concept 1 | `fc335029-ba36-4edf-9c7d-85f66d66ecea` | outline b, angled ascender — rejected |
| L1 concept 2 | `cac13241-92a3-42a4-83f0-ffae7bd1eb95` | solid b, 3-line doc counter — runner-up |
| L1 concept 3 | `1454c4ea-32d9-4e30-912e-e95805c2865a` | round bold b — rejected (odd bowl) |
| L1 concept 4 | `437a1b0b-1d27-4d43-a17a-7c7a84268149` | **winner** — tightest geometry |
| L2 refine A | `43ba006d-fb59-457e-8574-a84daf1d2b6d` | **final master** (3-line counter, corrected curves) |
| L2 refine B | `00476fcd-7be4-4cd4-af07-122fd6af2075` | stiff stem — rejected |
| L2 dark inverse | `5ec85635-7527-49ee-951b-6240e414c989` | off-white mark on #0F0D17 |
| L2 4K upscale | `44cae808-8bc8-4984-b8b7-85a383c74be0` | 4096×4096 master |

L1 prompt (04 §2 verbatim): *"Minimalist flat vector logo mark for a
developer tool named 'gitbrief'. A single bold abstract solid shape: a
modern geometric lowercase letter b whose inner counter space is formed by
two or three short horizontal text lines… Exactly two colors: deep violet
#6D4AFF solid mark centered on warm off-white #FAF9F7 rounded-square app
icon squircle…"* + style lock.
L2 refine prompt: *"Refine this exact logo mark: cleaner geometry, optically
corrected curves, tighter negative space…"* (reference: winner job).

**Shipped logo is the hand-traced SVG** (`src/components/site/logo.tsx`,
`src/app/icon.svg`) per 04 §2 — AI rasters are reference/master only.
Mounts: `public/assets/logo/gitbrief-icon-4k.png`, `gitbrief-icon-dark.png`,
`public/icon-512.png` (512²), `src/app/apple-icon.png` (180²).

## I2–I5 / O1 — Illustrations

| Asset | Winner job | Rejected job | Mount |
|---|---|---|---|
| I2 read/scan | `7ce6b9a0-…e49b` (clean vertical tree) | `63ce15e4-…4514` | `public/assets/illus/i2.webp` |
| I3 bundle | `ebe6e88f-…d974` (fold sequence + content lines) | `20a477e1-…71a7` | `public/assets/illus/i3.webp` |
| I4 empty state | `9b097091-…802f` | `231be49a-…da58` | `public/assets/illus/i4.webp` — used by results empty state (01 §21) |
| I5 404 | `23a62280-…4fd8a` | `b9c3e248-…a456` (not fetched) | `public/assets/illus/i5.webp` — used by `src/app/not-found.tsx` |
| O1 OG fallback | `15be1b52-…957eb` (16:9, clear left third) | `d3383e94-…8f99` (not fetched) | `public/assets/og-fallback.png` |

Prompts: 04 §3 verbatim + style lock (see git history of this file's
generation session; each prompt is embedded in the job params on Higgsfield).

## A2–A4 — How-it-works videos (optional polish, 04 §5)

The **code-built SVG/Framer animations remain the PRIMARY in-app
implementation** (04 §4 — they render real text). These videos are for
social posts / future section swap.

| Scene | Job id | Mount |
|---|---|---|
| A2 paste | `04738d41-caf8-4a07-a8d4-095343e4a410` | `public/assets/anim/a2-paste.mp4` |
| A3 read | `32f31255-49f6-48d1-ba89-245f9e5e8cfc` | `public/assets/anim/a3-read.mp4` |
| A4 brief | `b954e0f9-42ed-4f78-ac8c-8435400d873e` | `public/assets/anim/a4-brief.mp4` |

Prompts: 04 §5 formula — scene rewritten cinematically + style lock +
*"abstract short dash segments instead of any typed text, no letters
anywhere"* + *"smooth eased motion, seamless loop feeling"*.

## Checklist vs 04 §7

- logo svg + dark + favicons ✓ (SVG traced; ico covered by icon.svg — Next serves it)
- i2..i5 webp ✓ (single mode; dark variants deferred — light art reads fine on dark panel, regenerate on demand)
- og-fallback.png ✓
- A2 A3 A4 components ✓ (code, shipped in M2)
- Higgsfield videos ✓ (non-blocking polish)
- social launch card □ — needs gitbrief/gitbrief public repo analyzed (score-100 joke card)
