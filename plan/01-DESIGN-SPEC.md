# gitbrief — Frontend Design & UX Specification v1.0

**Product:** gitbrief (gitbrief.dev) — paste a GitHub repo URL, get a complete agent-readiness bundle: CLAUDE.md, AGENTS.md, rules files, and version-matched skill files, grounded in the actual codebase.
**Page:** Single-page landing + results flow. Stack: Next.js (App Router) · React · Tailwind CSS v4 · shadcn/ui · Framer Motion · Vercel.
**Design direction:** modern, minimalist, soft-technologic. Violet on warm off-white. One accent, spent deliberately. Line-art illustration language, single stroke weight. The hero is alive; everything below it is calm.

---

## 1. Brand & Design Tokens

### 1.1 Color — light mode (default)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#FAF9F7` | Page background (warm off-white, Span-style softness) |
| `--foreground` | `#1A1523` | Primary text (violet-tinted near-black — never pure #000) |
| `--primary` | `#6D4AFF` | THE accent: search bar focus, CTAs, grid hover, links, rotating hero word |
| `--primary-hover` | `#5B38F0` | Primary hover state |
| `--primary-soft` | `#EDE9FE` | Muted lavender fills: chips hover, selected tabs, badges |
| `--muted-foreground` | `#6E6785` | Secondary text, subtitles, captions |
| `--border` | `#E7E4EF` | All 1px borders, hero grid lines, dividers |
| `--card` | `#FFFFFF` | Elevated surfaces: search bar, code panels, cards |
| `--success` | `#1FA97C` | Valid-repo check, score "good" band |
| `--warning` | `#D97706` | Score "needs work" band |
| `--destructive` | `#DC2626` | Errors, score "poor" band |
| `--code-bg` | `#14111D` | Code/file-viewer panels (always dark, both modes) |

### 1.2 Color — dark mode

`--background #0F0D17` · `--foreground #EFEDF6` · `--card #171321` · `--border #262133` · `--primary` stays `#6D4AFF` (test: it passes on dark) · `--primary-soft #2A2344` · `--muted-foreground #9A93B0`. Toggle via class strategy; respect `prefers-color-scheme` on first load; persist choice in localStorage (site, not artifact — allowed).

### 1.3 Typography

| Role | Font | Sizes / weights |
|---|---|---|
| Display / headings | **Space Grotesk** (500, 700) | h1 clamp(2.5rem, 6vw, 4.25rem) / 1.05 line-height / -0.02em tracking; h2 2rem; h3 1.25rem |
| Body | **Inter** (400, 500) | 1rem / 1.6; small 0.875rem |
| Mono (brand-critical) | **JetBrains Mono** (400, 500) | URLs, chips, file names, code, the swap-trick line, score numbers |

Load via `next/font` with `display: swap`, subset latin. Max two weights per family.

### 1.4 Spacing, radius, elevation

Spacing scale: Tailwind default (4px base). Section vertical rhythm: `py-24` desktop / `py-16` mobile. Content max-width: `1100px`, gutter `px-6`.
Radii: `--radius-sm 8px` (chips, badges) · `--radius-md 12px` (cards, buttons) · `--radius-lg 16px` (search bar, panels) · logo squircle `22%` of size.
Elevation: prefer 1px borders over shadows. Exactly two shadows exist: search bar resting `0 1px 2px rgb(26 21 35 / 0.06)` and search bar focused `0 0 0 4px rgb(109 74 255 / 0.15), 0 8px 24px rgb(109 74 255 / 0.12)` (the "glow"). Nothing else casts shadow.

### 1.5 Iconography

Lucide, 1.5px stroke, `size-4` inline / `size-5` buttons / `size-6` section markers. Tech-stack logos: [simple-icons](https://simpleicons.org) rendered monochrome `--muted-foreground`, turning `--primary` on hover. Never multicolor icon walls — this is what keeps the page "not too colorful."

---

## 2. Page Anatomy (top → bottom)

```
┌──────────────────────────────────────────────┐
│ HEADER (fixed, transparent → solid on scroll)│
├──────────────────────────────────────────────┤
│ HERO — 100svh, interactive grid bg           │
│   h1 with rotating word · subtitle           │
│   THE SEARCH BAR · example chips · swap hint │
│   scroll cue ↓                               │
├──────────────────────────────────────────────┤  ← grid ends, flat bg begins
│ PREVIEW STRIP — animated mock of results     │
│ HOW IT WORKS — 3 steps + animations          │
│ LIVE EXAMPLE — real bundle, tabbed viewer    │
│ READINESS SCORE — shareable card teaser      │
│ GALLERY — 8 pre-analyzed repos               │
│ FAQ — 6 items, accordion                     │
│ FOOTER                                       │
└──────────────────────────────────────────────┘
```

---

## 3. Header

Fixed, `h-16`, z-50. Contents: left — logo mark (24px) + `gitbrief` wordmark in Space Grotesk 500; right — links `How it works · Gallery · FAQ` (Inter 500, `--muted-foreground`, hover `--foreground`), divider, GitHub button (star count fetched at build + revalidated 1h, Lucide `github` icon), theme toggle (sun/moon, no dropdown).
States: over hero → `bg-transparent`, no border. After `scrollY > 24px` → `bg-background/80 backdrop-blur-md border-b border-border`, transition 200ms ease-out. Mobile (<768px): links collapse into a sheet menu (shadcn `Sheet`), logo + hamburger only.
Anchor links scroll smoothly (`scroll-behavior: smooth`, respect reduced-motion → instant).

---

## 4. Hero (the signature section)

Full viewport (`min-h-[100svh]`, content vertically centered, slight upward bias `pb-[10vh]`).

### 4.1 Interactive grid background
- Implementation: single `<canvas>` absolutely positioned, hero-only. Cell size 48px. Lines `--border` at 55% opacity.
- Pointer interaction: cells within 140px radius of cursor tint their strokes toward `--primary`; intensity = smoothstep falloff from center; each cell's highlight decays over 600ms after the pointer leaves it (store per-cell `lastEnergized` timestamp, lerp in rAF loop). Feels like light trailing through the grid.
- Ambient idle: every 4–7s a random 1×1 cell softly pulses violet once (280ms in, 900ms out) so the hero is alive before any mouse movement. Disabled on touch devices (no cursor) — replace with the ambient pulses at 2× frequency.
- Edge treatment: radial mask (`radial-gradient` alpha) fades grid to 0 at hero edges so it never touches header/next section.
- Performance: draw only dirty cells; pause rAF when hero off-screen (IntersectionObserver) and on `document.hidden`. `prefers-reduced-motion`: static grid, no pulses, no hover trail.

### 4.2 Headline with rotating word
- Static line 1: `Make any repo` (foreground). Line 2: rotating word in `--primary` + trailing period in foreground.
- Word list (in order): `agent-ready.` `Claude-ready.` `Cursor-ready.` `Copilot-ready.` `Codex-ready.` `Gemini-ready.` — the rotation IS the feature list.
- Mechanics (framer-motion, per the 21st.dev animated-hero pattern): each word absolutely positioned; active word `y: 0, opacity: 1` (spring, stiffness 60, damping 14); outgoing `y: -40, opacity: 0`; incoming from `y: 40`. Interval 2200ms. Container width = longest word (measure once) to prevent layout shift. Pause rotation when tab hidden. Reduced-motion: crossfade only (no y travel).
- `aria-live="off"` on the rotator (announcing every 2s is hostile); the h1's accessible name is the full static sentence via `aria-label="Make any repo agent-ready"`.

### 4.3 Subtitle
One sentence, Inter 400, `--muted-foreground`, max-w-[560px] centered: `Paste a GitHub URL — get CLAUDE.md, AGENTS.md, rules and version-matched skill files, grounded in your actual codebase. Free, no signup.`

### 4.4 The Search Bar (the product)
- Dimensions: `h-16`, max-w-[640px], `rounded-[16px]`, `bg-card`, `border border-border`, resting shadow (§1.4). Left: Lucide `search` icon, `--muted-foreground`. Right: submit button `Brief it →` (`--primary` bg, white text, `h-11`, `rounded-[12px]`, mr-2).
- Placeholder: self-typing loop in JetBrains Mono — types `github.com/vercel/next.js`, holds 1.6s, deletes, types `github.com/supabase/supabase`, cycles 4 repos. 45ms/char type, 25ms/char delete. Stops permanently on first focus. Reduced-motion: static placeholder `github.com/owner/repo`.
- **States:**
  - *Default:* as above.
  - *Focus:* border → `--primary`, glow shadow (§1.4), 180ms ease-out. Grid cells near the bar energize once (one 300ms pulse ring) — the page reacts to intent.
  - *Typing / validating:* on paste or 350ms debounce, parse input. Accepts: full URLs, `owner/repo` shorthand, `/tree|/blob` deep links (strip, keep branch), trailing `.git`, `www.`. While checking repo existence (GitHub API): tiny spinner replaces search icon.
  - *Valid:* repo avatar (20px, rounded) + `owner/repo` render as a chip inside the bar's left side; check icon `--success`; button label becomes `Brief owner/repo →` (truncate repo name at 18 chars with `…`).
  - *Invalid / not found:* border `--destructive` (no glow), shake 2×4px 250ms (skip on reduced-motion), helper text below in `--destructive` 0.875rem: `Repo not found — check the URL or try owner/repo`. Never block typing.
  - *Private repo detected (404 while logged out):* helper: `Private repos are coming soon — public repos only for now.`
  - *Submitting:* button shows spinner + `Reading repo…`, bar locks (aria-busy), then route transition to `/{owner}/{repo}`.
- Keyboard: `⏎` submits when valid; `/` anywhere on page focuses the bar (show `/` kbd hint at bar right edge, hidden on mobile); `Esc` clears.
- Below the bar, two rows, both centered:
  - Example chips: `try:` label + 3 chips (`vercel/ai`, `shadcn-ui/ui`, `supabase/supabase`) — JetBrains Mono 0.8125rem, `border-border` pill, hover `--primary-soft` bg + `--primary` text, click = fill bar + auto-submit.
  - Swap hint, mono, `--muted-foreground`: `or change github.com → gitbrief.dev in any repo URL` with the two domains in `--foreground`. A 24px line-art cursor-swap glyph precedes it.

### 4.5 Scroll cue
Lucide `chevron-down` in a 36px circle, `--border` outline, gentle 8px bob loop (2.4s), sits at hero bottom-center. Click scrolls to Preview strip. Disappears after first scroll. Hidden for reduced-motion (static chevron instead).

---

## 5. Preview Strip (answer "what do I get?" in one scroll)

A framed mock of the results screen, max-w-[900px], `--card` bg, border, `rounded-[16px]`, slight perspective lift on scroll-enter (y: 32→0, opacity 0→1, 500ms ease-out, once).
Inside, left→right auto-playing sequence when ≥50% in view (IntersectionObserver, plays once):
1. Stack icons row lights up one-by-one (80ms stagger): Next.js, React, Tailwind, Supabase, TypeScript… each fades from muted to full.
2. File tree assembles line-by-line (60ms stagger, 14 lines): `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `.claude/skills/tailwind-v4/SKILL.md`, `.claude/skills/supabase/SKILL.md`, `.mcp.json`…
3. Caption fades in bottom-right, mono, muted: `analyzed in 9.4s · 0 hallucinated commands`.
Reduced-motion: everything rendered in final state immediately.

---

## 6. How It Works (3 steps)

Grid: 3 columns desktop, stacked mobile, gap-8. Each step card: NO border (calm section), 64px illustration/animation slot on top, step label eyebrow (mono, `--primary`, `01 · PASTE`), h3, one-line body.

| # | Eyebrow | H3 | Body | Animation (asset A2–A4) |
|---|---|---|---|---|
| 01 | PASTE | Drop in any repo URL | Or swap github.com → gitbrief.dev. | Browser opens, cursor types URL, enter |
| 02 | READ | We read facts, not vibes | Lockfiles, scripts, configs — exact versions, real commands. | Scan-line passes over file tree, manifests glow, tech marks pop |
| 03 | BRIEF | Download your bundle | Agent files + official, version-matched skills, in the right paths. | Documents fold into a neat bundle, checkmark |

Below the three steps, one full-width quiet credibility line (border-t, pt-8, centered, 0.9375rem `--muted-foreground`): `Official skills first — shadcn, Supabase, Anthropic and more. We only generate when no official skill exists, grounded in current docs — and every command is verified against your repo.`

Steps animate in on scroll: opacity + y:24→0, stagger 120ms, once.

---

## 7. Live Example (show, don't tell)

H2: `This is a real brief.` Sub: `Generated for vercel/ai — untouched.`
Component: tabbed file viewer, max-w-[900px], `--code-bg` panel, `rounded-[16px]`, header bar with traffic-light dots (decor, 40% opacity) + file tabs in mono 0.8125rem: `AGENTS.md · CLAUDE.md · skills/ · .mcp.json`. Active tab: `--primary` underline 2px. Content: real pre-generated output, syntax-highlighted (Shiki, one dark theme both modes), max-h-[420px] scroll, top/bottom fade masks 24px. Copy button per tab (Lucide `copy` → `check` 1.2s). `skills/` tab shows a two-pane mini tree + file.
Caption row under panel: `⏱ 9.4s · 📦 6 files · ✓ 14 commands verified` (mono chips).

---

## 8. Readiness Score teaser

Two-column (stack on mobile): left — H2 `How agent-ready is your repo?`, body copy (2 lines), CTA button `Score my repo` (secondary style: border `--primary`, text `--primary`, hover fill `--primary-soft`) which scrolls to hero and focuses the bar.
Right — the shareable score card (the OG-image template, rendered live in DOM): `--card`, border, `rounded-[16px]`, 420×260. Contents: repo avatar+name (mono), giant score `86` in Space Grotesk 700 64px `--success`, grade ring (SVG arc, animates 0→86% over 900ms ease-out on scroll-enter), 4 check rows (mono 0.75rem): `✓ AGENTS.md present · ✓ scripts documented · ✓ lockfile pinned · ✗ no .cursorignore`, gitbrief wordmark bottom-right 40% opacity. This exact layout is reused by the `/api/og` endpoint (Vercel OG / satori) for share images.

---

## 9. Gallery

H2: `Fresh briefs.` Grid 4×2 desktop / 2×4 tablet / 1-col mobile, gap-4. Card: `--card`, border, `rounded-[12px]`, p-4, row = avatar 28px + `owner/repo` mono 0.875rem; below: 4–5 monochrome stack icons + score badge pill right-aligned (color by band: ≥80 success / 50–79 warning / <50 destructive, `--primary-soft`-style tinted bg at 12% of the band color). Hover: border → `--primary` 40%, translate-y -2px, 150ms. Click → cached result page.
Data: top pre-analyzed repos, ISR revalidate 24h. Empty/failed cache entry: card renders with `re-analyzing…` shimmer, never a broken card.

---

## 10. FAQ

Max-w-[720px]. shadcn `Accordion`, single-open. 6 items: Is it free? · Do you store my code? (lead trust answer: *we read manifests and configs via GitHub's API; we don't clone or keep your source*) · How is this different from /init? (the research-backed precision answer) · What's a skill file? · Private repos? · How accurate is detection?
Chevron rotates 180°, content height auto-animates 200ms ease-out. Each answer ≤3 sentences.

---

## 11. Footer

Border-t, py-12, 3 columns → stacked mobile: (1) logo + one-liner `Briefings for AI coding agents.` (2) links: GitHub repo, X, Privacy, Contact. (3) `Built by [name]` → your GitHub, Donate ♥ button (ghost style), theme toggle repeat. Bottom line, 0.75rem `--muted-foreground`: `© 2026 gitbrief · Not affiliated with GitHub, Inc.`

---

## 12. Motion Spec (global)

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Grid cells | pointer proximity | stroke tint → primary, falloff | 600ms decay | linear decay, smoothstep falloff |
| Grid ambient pulse | idle timer 4–7s | single cell opacity pulse | 280/900ms | ease-out |
| Hero word | interval 2200ms | y ±40 + fade, spring | ~450ms | spring(60,14) |
| Placeholder typing | load → first focus | char type/delete | 45/25ms per char | linear |
| Search focus glow | focus | border+shadow | 180ms | ease-out |
| Invalid shake | validation fail | translateX ±4px ×2 | 250ms | ease-in-out |
| Section reveals | 20% in view, once | opacity 0→1, y 24→0 | 500ms | cubic-bezier(0.16,1,0.3,1) |
| Step stagger | section reveal | children delay | 120ms/child | same |
| Preview sequence | 50% in view, once | staggered build (§5) | ~2.5s total | ease-out |
| Score ring | 50% in view, once | arc 0→value | 900ms | ease-out |
| Card hover | hover | y -2px, border tint | 150ms | ease-out |
| Header solidify | scrollY>24 | bg+blur+border | 200ms | ease-out |

Global rule: every scroll animation runs **once** (`viewport={{ once: true }}`). `prefers-reduced-motion`: all of the above collapse to opacity-only ≤150ms or static; typing/rotator/bob/pulses disabled entirely.

---

## 13. Responsive

| Breakpoint | Changes |
|---|---|
| ≥1024px | Full layout per spec |
| 768–1023px | Steps 3→1col? no: 3 stay but tighter (gap-4); gallery 2col; score section stacks |
| <768px | Header→sheet menu; h1 clamp floor 2.5rem; search bar h-14, button icon-only (`→`); chips scroll horizontally (no wrap, overflow-x, edge fade); grid cell 40px; `/` kbd hint hidden; steps & everything 1-col; live example tabs scroll horizontally |
| <380px | Swap-hint wraps to two lines; score card scales 0.85 |

Touch: grid hover replaced by ambient pulses (§4.1); all hover states have visible focus/active equivalents.

---

## 14. Accessibility

- Landmark order: `header → main (h1 → sections with h2) → footer`. One h1 exactly.
- Focus visible everywhere: 2px `--primary` outline, 2px offset — never removed, never color-only.
- Search bar: `role=search` wrapper, `<input aria-label="GitHub repository URL">`, validation via `aria-describedby` + `aria-invalid`; submit disabled state announced.
- Rotating word: aria-hidden rotation, static aria-label on h1 (§4.2).
- Canvas grid: `aria-hidden="true"`, pure decoration.
- Tabs (live example): proper `role=tablist` keyboard arrows (shadcn Tabs).
- Contrast checks: `--muted-foreground` on `--background` = 4.6:1 ✓; primary on white 4.9:1 ✓; verify dark-mode pairs; success/warning badges use tinted-bg + dark text, not white-on-color.
- Copy buttons announce `Copied` via `aria-live=polite`.

---

## 15. Asset Production Manifest (Higgsfield + code)

**Generated with Higgsfield (once credits are in):**

| ID | Asset | Model / notes | Prompt core |
|---|---|---|---|
| L1 | Logo, 4 concepts | nano_banana_pro, 1:1, count 4 | Bold abstract lowercase **b** whose counter reads as 2–3 horizontal briefing lines; solid violet #6D4AFF on off-white #FAF9F7 squircle; flat vector, Span/Linear-era, no gradients/outlines/text |
| L2 | Logo refinement | winner of L1 → 1 refined + dark-inverse (off-white mark on #0F0D17) + upscale_image 4K master | — |
| I1 | Step-02 illustration | nano_banana_pro, 1:1 | Thin line-art file tree, scan line, glowing manifest docs, violet accent, off-white bg, single 1.5px stroke |
| I2 | Step-03 illustration | nano_banana_pro, 1:1 | Line-art documents folding into bundle with check, same style constraints |
| O1 | OG fallback image | nano_banana_pro, 16:9 (1200×630 crop) | Wordmark-safe abstract violet line-grid composition (per-repo OG images come from `/api/og`, code) |
| A2–A4 | How-it-works loops | kling3_0_turbo 5s each — **requires plan tier**; abstract-dash trick for any typed text | Scenes per §6 table, style-locked: "single-weight thin line art, deep violet #6D4AFF on off-white, flat vector, no real letters, no people" |

Rule: generate the full set in one session with identical style clauses so all assets match; regenerate any outlier rather than mixing styles.

**Built in code (superior for UI-narrative motion):**
- Hero grid canvas, word rotator, self-typing placeholder, preview-strip build sequence, score ring — all specced above, all Framer Motion/canvas.
- **Fallback if video stays unavailable:** steps 01–03 use code-built SVG micro-animations (browser frame + typing caret is ~40 lines of SVG+motion and renders real, crisp text — arguably better than AI video here). Higgsfield videos then become optional polish for social posts.

---

## 16. Copy Deck (final strings, single source of truth)

- h1: `Make any repo` + rotator (§4.2 list)
- sub: `Paste a GitHub URL — get CLAUDE.md, AGENTS.md, rules and version-matched skill files, grounded in your actual codebase. Free, no signup.`
- button: `Brief it →` / valid: `Brief {owner}/{repo} →` / loading: `Reading repo…`
- swap hint: `or change github.com → gitbrief.dev in any repo URL`
- steps: per §6 table · credibility line: per §6
- example: `This is a real brief.` / `Generated for vercel/ai — untouched.`
- score: `How agent-ready is your repo?` / CTA `Score my repo`
- gallery: `Fresh briefs.`
- footer one-liner: `Briefings for AI coding agents.` · legal: `Not affiliated with GitHub, Inc.`
- errors: `Repo not found — check the URL or try owner/repo` · `Private repos are coming soon — public repos only for now.`

---

## 17. Build Order

1. Tokens + fonts + layout shell (header/footer, theme toggle)
2. Hero: grid canvas → search bar with all states → rotator → chips/hint
3. Preview strip + How-it-works (with SVG fallback animations)
4. Live example (Shiki, real generated content) + FAQ + footer polish
5. Score card + `/api/og` + Gallery (needs backend cache — stub with fixtures first)
6. Asset swap-in: logo (L2), illustrations, videos if plan unlocked
7. A11y + reduced-motion + Lighthouse pass (targets: Perf ≥95, A11y 100, SEO 100)

---

# PART B — RESULTS PAGE `/{owner}/{repo}` (approved design)

## 18. Route & data behavior

- Catch-all route `app/[owner]/[repo]/page.tsx`. Also accept and normalize `/owner/repo/tree/*`, `/blob/*`, trailing `.git` → redirect 301 to canonical `/{owner}/{repo}`.
- On load: server component fetches repo meta (avatar, stars, language, default branch) + latest `analyses` row for `repo@head_sha`.
  - **Cache hit (status=complete):** render full results instantly. Show `cached {relative_time} · re-analyze` link (mono, muted) top-right; re-analyze triggers new job (respects rate limit).
  - **No analysis:** create analysis row (status=detecting), trigger pipeline, render Phase 1 shell.
- Live updates: subscribe to Supabase Realtime on the `analyses` row + `bundle_files` inserts. SSE fallback endpoint `/api/analyses/{id}/stream` if Realtime unavailable.

## 19. Phase 1 — "Reading" (0–3s, deterministic)

Layout: centered column max-w-[760px].
1. **Repo header** (instant): avatar 48px, `owner/repo` in Space Grotesk 600 1.5rem, star count + primary language + default branch as mono chips. Fades in 200ms.
2. **Detection panel**: card, border, rounded-16. Header row: `Reading facts…` + animated ellipsis. Body streams items as SSE events arrive:
   - Manifest lines: `✓ package.json · ✓ pnpm-lock.yaml · ✓ tailwind.config.ts` — mono 0.8125rem, appear 60ms stagger.
   - Tech chips grid: each detected tech pops in (scale 0.9→1, 150ms): simple-icons mark + name + **exact version** (`next 15.3` `tailwind 4.1.4`) in mono. Version sourced from lockfile — never ranges.
   - Category grouping order: Framework · Language · Styling · Database · Auth · Testing · Infra · Tooling.
3. When detection completes: panel header becomes `{n} technologies · {m} manifests read · {t}s` and page transitions to Phase 2 layout (layout animation 300ms, panel docks to top).

## 20. Phase 2 — "Briefing" (3–30s, generative)

Two-pane: **left sidebar 280px** (file tree of the bundle) + **right main** (file viewer). Stacks on mobile (tree becomes horizontal scroller of file chips above viewer).

**Sidebar tree** — items appear as jobs complete, each row: file icon + path + status glyph:
- `✓` green — official skill fetched (tooltip: source domain)
- `⚡` violet — generated by gitbrief (tooltip: grounding sources)
- `⧗` muted pulse — pending
- `!` amber — skipped (degraded; tooltip explains, bundle still ships)
Order: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/gitbrief.mdc`, `.claude/skills/*/SKILL.md` (alpha), `.mcp.json`, `.cursorignore`.

**Top action bar** (sticky): Readiness Score badge (ring + number, links to score breakdown modal) · `Download .zip` (primary) · `Copy all as one prompt` (secondary; concatenates bundle with file-path headers) · share icon (copies URL; toast `Link copied — OG card ready`).

**File viewer**: identical component to landing §7 (Shiki, dark panel, copy per file, fade masks). Active file syncs with sidebar selection; while a selected file is pending show skeleton lines (shimmer, 8 rows).

**Provenance footer** (every file, always): mono 0.75rem muted, e.g.
`source: official · ui.shadcn.com/docs/skills · fetched 2h ago` or
`generated · grounded in tailwindcss@4.1 llms.txt + context7 · 14/14 commands verified · 0 unverifiable claims removed`.
This line is the trust product. Never omit it.

**Score breakdown modal**: checklist with pass/fail rows + one-line fix hints; `Copy fix list` button. Score bands: ≥80 success · 50–79 warning · <50 destructive.

## 21. States & edge cases (results page)

| Case | Behavior |
|---|---|
| Repo not found / private | Friendly 404 panel with I5 art, search bar embedded to try again |
| Empty repo / no manifests | I4 art + `Nothing to read yet — this repo has no manifests we recognize.` + list of what we look for |
| Monorepo | Detection groups per workspace package; tree shows per-package skills; CLAUDE.md documents workspace topology |
| Rate limited | Panel: `Daily limit reached (10/day) — resets in {t}` + donate link (soft) |
| Job failure (single skill) | `!` row, bundle completes without it, footer notes exclusion |
| Job failure (fatal) | Status=failed row → error panel + `Retry` (doesn't consume limit) |
| Very large repo (>8k files) | Tarball step skipped; manifest-only mode; banner: `Large repo — analyzed from manifests only.` |

## 22. OG image per repo

`/api/og/{owner}/{repo}` — Vercel OG (satori), 1200×630, exact score-card layout from §8: bg `#FAF9F7`, repo identity, giant score, 4 check rows, wordmark. Referenced in page metadata; regenerated when analysis updates.
