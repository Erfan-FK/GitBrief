# MILESTONE-REPORT

## M1 — Foundation (shell + tokens)

**Shipped**
- Next.js 15 App Router scaffold, TypeScript strict, Tailwind CSS v4, pnpm.
- Design tokens per 01 §1 (light + dark) in `src/app/globals.css`, mapped to Tailwind theme; radii, the two sanctioned shadows, focus-visible outline.
- Fonts via `next/font`: Space Grotesk (500/700), Inter (400/500), JetBrains Mono (400/500), swap, latin subset, two weights per family.
- Header (fixed, transparent → solid at scrollY>24, nav links, GitHub link, theme toggle) and footer per 01 §3/§11.
- Theme toggle: next-themes class strategy, respects `prefers-color-scheme`, persists in localStorage.
- Umami script (renders only when `NEXT_PUBLIC_UMAMI_ID` set), Sentry (client/server/edge, DSN-gated).
- CI: lint + typecheck + build on PR and main pushes (`.github/workflows/ci.yml`).
- `.env.example` with full 00 §env list.

**Stubbed / deferred**
- Vercel deploy dropped per user decision — hosting chosen later.

## M2 — Landing page complete (01 Part A)

**Shipped**
- Hero: interactive grid canvas (pointer trail, ambient pulses, IO/visibility pause, reduced-motion static), rotating word (spring, width-reserved, aria-safe), self-typing placeholder, scroll cue.
- Search bar, all 01 §4.4 states: default/focus glow/validating spinner/valid chip + avatar + dynamic button/invalid shake + helper/submitting lock; `/` shortcut, Esc clear, Enter submit; chips auto-submit; swap hint.
- `/api/repos/resolve` (02 §1 contract, Zod, RFC7807 errors) + `resolveRepoInput` parser with 12 unit tests.
- Preview strip (staggered build sequence), How-it-works (3 steps + A2/A3/A4 SVG/Framer animations per 04 §4, credibility line), Live example (Shiki one-dark, 4 tabs, copy buttons, skills tree pane), Score teaser (animated ring, OG-template layout), Gallery (8 fixture repos, band-colored score pills), FAQ (Base UI accordion, single-open).
- Header completed: mobile sheet menu, GitHub star count (build-time fetch, 1h revalidate, null-safe).
- Results route stub `/{owner}/{repo}` as search navigation target.
- Playwright e2e (4 tests, system Chrome): hero render, invalid/valid search + navigation, `/` shortcut, FAQ.

**Stubbed / deferred**
- Live example + gallery + score = fixtures until M4/M5.
- Lighthouse pass pending hosting decision; a11y patterns per 01 §14 implemented.
