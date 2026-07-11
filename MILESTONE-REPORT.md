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
- Mobile sheet menu, header star count → M2 (see DECISIONS.md).
- Landing page content is a placeholder shell → M2.
- Vercel deploy: manual step (link repo in Vercel dashboard); not doable from this environment.
