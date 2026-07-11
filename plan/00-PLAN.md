# 00-PLAN — gitbrief: Master Implementation Plan

> You are implementing **gitbrief** (gitbrief.dev): paste a GitHub repo URL (or swap `github.com` → `gitbrief.dev`) and receive a complete, verified agent-readiness bundle — CLAUDE.md, AGENTS.md, `.cursor/rules`, per-technology SKILL.md files (official ones fetched, missing ones generated grounded in current docs), `.mcp.json` suggestions, and an ignore file — plus a shareable Readiness Score.
> Read ALL spec files before writing code. Specs are authoritative; when something is unspecified, follow the closest specified pattern and note the decision in `DECISIONS.md`.

## File map (this plan set)
| File | Contents |
|---|---|
| `00-PLAN.md` | This file — product, stack, milestones, DoD, launch checklist |
| `01-DESIGN-SPEC.md` | Complete frontend: tokens, landing page (Part A), results page (Part B), motion, a11y, copy deck |
| `02-BACKEND-SPEC.md` | Pipeline, API contracts, detection engine, skill resolution, generation prompts (literal), validators, scoring, caching, rate limits, eval harness |
| `03-DB-SPEC.md` | Full SQL schema, indexes, RLS, seed data (40 technologies + detection rules + skill sources) |
| `04-ASSETS.md` | Every visual asset: generation prompts, SVG-fallback specs, file naming, mount points |
| `AGENTS.md` / `CLAUDE.md` | Agent context for THIS repo (dogfooding our own house style) |

## Core product principles (non-negotiable)
1. **Facts before generation.** Deterministic parsing (lockfiles, scripts, configs, tree) produces ground truth. The LLM only writes connective tissue.
2. **Verify or delete.** Every command, path, and version in generated output passes the validator gate or is stripped. Research basis: LLM-generated context files via `/init` measurably perform ≤ no file at all; ours must be different in kind.
3. **Official first.** If a vendor ships a skill (shadcn, Supabase, Anthropic…), fetch theirs; generate only when nothing official exists, grounded in llms.txt/Context7, cached per `lib@version`.
4. **Short files win.** CLAUDE.md target ≤120 lines, command-first, zero prose padding.
5. **Provenance everywhere.** Every output file displays its sources and verification counts.
6. **Cache is the business model.** Repo-level (`owner/repo@sha`) and skill-level (`tech@major.minor`) caching make marginal cost ≈ $0.

## Tech stack (final — do not substitute)
- **App:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Framer Motion, Shiki (highlighting), Lucide + simple-icons.
- **Hosting:** Vercel. **DB/Storage/Realtime:** Supabase (Postgres). **Hot cache + rate limit:** Upstash Redis. **Jobs:** Inngest (step functions, retries). **LLM:** Anthropic API — `claude-sonnet-4-6` for generation, `claude-haiku-4-5` for classification; temperature 0.2; structured outputs. **Grounding:** vendor llms.txt → Context7 API → raw docs fetch (in that order). **GitHub:** GitHub App installation token (server-only). **Analytics:** Umami (self-hosted on Vercel, cookie-free). **Errors:** Sentry. **Repo analysis lib:** `@specfy/stack-analyser` + custom rule pack (02 §3).
- **Repo layout:** single Next.js app, `/src` structure: `app/`, `components/` (ui/, landing/, results/), `lib/` (github/, detect/, resolve/, generate/, validate/, score/), `inngest/`, `db/` (schema.sql, seed/), `eval/`, `public/assets/`.

## Environment variables (create `.env.example`)
`ANTHROPIC_API_KEY` · `GITHUB_APP_ID` `GITHUB_APP_PRIVATE_KEY` `GITHUB_APP_INSTALLATION_ID` · `SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `UPSTASH_REDIS_REST_URL` `UPSTASH_REDIS_REST_TOKEN` · `INNGEST_EVENT_KEY` `INNGEST_SIGNING_KEY` · `CONTEXT7_API_KEY` (optional; degrade to llms.txt-only) · `SENTRY_DSN` · `NEXT_PUBLIC_UMAMI_ID`.

## Milestones & Definitions of Done

### M1 — Foundation (shell + tokens)
Scaffold, fonts, tokens (01 §1), header/footer, theme toggle, Umami, Sentry, CI (lint+typecheck+build on PR).
**DoD:** deployed on Vercel; Lighthouse a11y 100 on empty shell; dark/light correct.

### M2 — Landing page complete (01 Part A)
Hero grid canvas, search bar (ALL states incl. validation + `/` shortcut), word rotator, chips, preview strip, how-it-works (SVG fallback animations from 04 §4), live example (fixture content), score teaser (fixture), gallery (fixture), FAQ, footer.
**DoD:** every state in 01 §4.4 demonstrable; reduced-motion pass; mobile per 01 §13; Lighthouse Perf ≥95/A11y 100/SEO 100.

### M3 — Detection pipeline (fast path)
URL normalization, GitHub client, tree fetch, manifest fetch (02 §2), detection engine + rule pack (02 §3), lockfile version extraction, languages API, SSE stream, results page Phase 1 (01 §19), `analyses` caching.
**DoD:** `vercel/ai`, `supabase/supabase`, `shadcn-ui/ui`, a Python repo (`fastapi/fastapi`), a Go repo (`gin-gonic/gin`) all detect correctly with exact versions in <3s p50; monorepo grouping works on `vercel/next.js`.

### M4 — Deep pipeline (generation)
Inngest chain (02 §5): tarball → stack-analyser → skill resolution (02 §6) → generation (02 §7 prompts) → validators (02 §8) → scoring (02 §9) → zip to Storage → Realtime updates. Results Phase 2 UI (01 §20), provenance footers, download/copy actions, edge cases (01 §21).
**DoD:** full bundle for the 5 M3 repos; validator strips a planted false command in test; single-skill failure degrades gracefully; cached repo renders <500ms.

### M5 — Score, OG, gallery, seed
Scoring live, breakdown modal, `/api/og/{owner}/{repo}`, gallery backed by DB, seed script pre-analyzes top 30 repos (list in 03 §5), sitemap for analyzed repos.
**DoD:** OG card renders correctly in social debuggers; gallery = real data; sitemap valid.

### M6 — Hardening + eval + launch
Rate limiting (10/day/IP, Redis sliding window), abuse guards (repo size cap, timeout budgets), eval harness (02 §10) with golden-set report committed, security pass (02 §11), `robots.txt`, analytics events (02 §12), donate links, README with badges, asset swap-in from 04 when ready.
**DoD:** eval score report generated; load test 50 concurrent analyses; zero unhandled promise rejections in logs; launch checklist below green.

## Launch checklist
Domain live w/ HTTPS · gitbriefs.com 301 → gitbrief.dev · GitHub org + repo public (MIT) · CLAUDE.md/AGENTS.md in repo (dogfood) · 30 repos pre-analyzed · OG cards verified · donate buttons live · Show HN draft + r/ClaudeAI, r/cursor, r/ChatGPTCoding posts drafted · Umami dashboard bookmarked · rollback = Vercel instant revert.

## Monetization phasing (context for architecture only — build NO billing UI)
Phase 0 (now): free public repos + donations. Phase 1 (post-traction): Pro ~$7/mo = private repos (OAuth), unlimited, history, drift-check. Phase 2: Team ~$19/seat = GitHub Action, PR drift-bot, API.
**Architectural consequences to implement NOW:** nullable `user_id` on `analyses`; rate-limit values read from config keyed by plan (`anon` only today); private-repo code paths cleanly stubbed behind `plan !== 'anon'` guard; no other billing code.

## Out of scope for v1 (do not build)
Auth/accounts · private repos · PR creation · webhooks/re-analyze automation · Windsurf/GEMINI.md outputs (format writers are pluggable — leave the interface, 02 §7.5) · chat-with-repo · wiki generation · billing.

## Working agreements for the implementing agent
- TypeScript strict; no `any` without comment. Zod-validate every external payload (GitHub API, LLM output, SSE events).
- Test pyramid: unit for detect/validate/score (vitest); integration fixtures = recorded GitHub API responses in `eval/fixtures`; e2e happy path (Playwright) for M2 and M4.
- Never log repo file contents. Never store source code beyond the job's temp dir. See 02 §11.
- Keep `DECISIONS.md` updated with any deviation + reason.
- Commit per milestone task; conventional commits; each milestone ends with a short `MILESTONE-REPORT.md` update (what shipped, what's stubbed).
