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

## M3 — Detection pipeline (fast path)

**Shipped**
- Supabase project `tuzeneuwymvoygtxsaui` — full 03 §1 schema + RLS applied; 75 technologies + 121 detection rules seeded (`db/seed`).
- Canonical registry `src/lib/detect/registry.ts` (75 techs, dependency/file/config-pattern rules per 03 §4).
- GitHub client (meta, head sha, recursive tree w/ truncated→largeRepo, languages, raw blobs).
- Candidate selection per 02 §2.3 (priority order, ≤30 blobs, two-phase for workspace package.json).
- Detection engine layers 1–5: dep maps (npm/pypi/go/cargo/composer/gem/maven), file+config rules, lockfile version extraction (pnpm v5/v9, package-lock v1–3, yarn classic+berry, poetry/uv/Cargo TOML, go.mod, composer.lock, Gemfile.lock), disambiguators (tailwind v4, next app/pages router, react major, package manager), monorepo workspace grouping with per-package paths. Evidence ≤120ch on every detection.
- SSE stream endpoint (repo/manifest/tech/detection_complete/error events) + `analyses` caching by repo@head_sha (active when service key present).
- Results page Phase 1 (01 §19): repo header chips, streaming manifest list, category-grouped tech chips with exact versions.
- 24 unit tests (12 parser + 5 engine + 12 resolver → 29 total with M2).

**DoD verification (local dev, warm)**
- vercel/ai: 24 techs, exact versions (next 15.5.18, react 19 rc, …), monorepo ✓ — engine 1.3s
- supabase/supabase: 29 techs, monorepo ✓ · shadcn-ui/ui: 20 techs ✓
- fastapi/fastapi: python/fastapi via pyproject ✓ · gin-gonic/gin: Go via go.mod ✓ (see DECISIONS re self-detection)
- vercel/next.js: monorepo grouping ✓, 19 techs
- Engine <2s on all; wall time 2–4s warm (fetch-bound; <3s p50 achievable with edge cache in prod)

**Stubbed / deferred**
- GitHub App token, Upstash Redis, Realtime, rate limiting → M4/M6.
- `/api/analyses` POST + id-based stream route → M4 (Inngest pipeline).
