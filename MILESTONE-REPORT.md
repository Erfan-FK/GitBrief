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
- GitHub App token, Upstash Redis, Realtime, rate limiting → M6.

## M4 — Deep pipeline (generation)

**Shipped**
- FactSheet builder (02 §7.2): scriptsMap per package, Makefile/justfile targets, depth-3 structure tree, workspace topology, README excerpt, existing-config audit (02 §4 stale-claim detection).
- CanonicalBrief generation (02 §7.1/7.2): Sonnet temp 0.2 with schema retry, falling back to the deterministic facts-only brief — the product never blocks on LLM flakiness. Runs LLM-free until `ANTHROPIC_API_KEY` is set.
- Format writers (02 §7.5): AGENTS.md, CLAUDE.md (commands-first, ≤120 lines), `.cursor/rules/gitbrief.mdc`, `.mcp.json` (from registry `mcp_server_json`), `.cursorignore` (tree-derived).
- Validator gate (02 §8): commands vs scriptsMap/targets, paths vs tree, version claims vs detection, link domain allowlist; line-level strip; planted-hallucination unit test proves the gate (M4 DoD ✓).
- Skill resolution (02 §6): official-first (supabase + anthropic verified fetchable), sanitizer with prompt-injection quarantine (02 §6.1), LLM generation grounded in vendor llms.txt (skips with reason when no key/grounding — single-skill failure degrades, run completes: M4 DoD ✓).
- Readiness score (02 §9): 13 deterministic checks = 100 pts, bands, fix hints.
- Deep-path generator streams `file`/`score`/`analysis_complete` SSE events after detection; bundle + score persisted (bundles/bundle_files) and replayed on cache hit when service key present.
- Inngest v4 function `analysis-run` + `/api/inngest` handler (background re-analysis path).
- Results Phase 2 (01 §20): sticky action bar (score badge, Download .zip via client-side fflate, Copy-all-as-prompt with token trailer, share), sidebar tree with ✓/⚡/! status glyphs, viewer with per-file copy + provenance footer on every file.

**DoD status**
- Full bundle for M3 repos ✓ (verified live: vercel/ai 5 files + skips; supabase/supabase 6 files incl. official supabase skill)
- Validator strips planted false command ✓ (unit test) · single-skill failure degrades ✓
- Cached repo <500ms: implemented (DB replay) — demonstrable once `SUPABASE_SERVICE_ROLE_KEY` is set.

## M5 — Score, OG, gallery, seed

**Shipped**
- Score live in results + breakdown modal with pass/fail rows, points, fix hints, `Copy fix list`.
- `/api/og/{owner}/{repo}`: satori/ImageResponse 1200×630, §8 card layout (avatar, mono name, ring, giant score, check rows, wordmark); graceful "not analyzed yet" variant; bundled Space Grotesk + JetBrains Mono TTFs.
- Results page metadata: OG + twitter card reference the endpoint.
- Gallery: server-fetched from `analyses` (anon RLS read), 24h ISR, fixture fallback when <4 real rows (never a broken card).
- `app/sitemap.ts`: landing + analyzed repos.
- `pnpm db:pre-analyze`: drives the pipeline over the top-30 list (03 §4).

**Blocked on user secrets**
- Real gallery data + 30 pre-analyzed repos + real OG scores all need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then: `pnpm dev` + `pnpm db:pre-analyze`.
- OG "renders correctly in social debuggers" needs a deployed URL (hosting TBD).

## M6 — Hardening + eval + launch

**Shipped**
- Rate limiting (02 §11): 10/day/IP sliding window, plan-keyed config (`anon` only), Upstash REST when configured with in-memory fallback; quota consumed only on FRESH runs — cache replays free. Rate-limited panel per 01 §21 (reset time + soft donate link). Unit-tested (10 allowed, 11th blocked).
- Abuse guards: >8k-file trees → manifest-only mode; 120s wall-clock budget on the stream.
- Security pass (02 §11): secret-scan on evidence excerpts (GitHub/OpenAI/AWS/Slack/JWT tokens + key=value assignments → `[redacted]`), strict CSP (self + Umami only; verified zero violations), nosniff/referrer/permissions headers, frame-ancestors none.
- Eval harness (02 §10): `pnpm eval` → `eval/report.md`; metrics: command coverage (inline + fenced commands vs our FactSheet), path accuracy (invented paths = hard fail, exit 1), length ratio, stripped-claim counts. First report committed: 0 invented paths across golden set. LLM-judge activates with `ANTHROPIC_API_KEY`.
- Analytics events (02 §12): analyze_submitted{source}, analysis_completed{cached,durationMs}, bundle_downloaded, prompt_copied, file_copied{file}, score_viewed, share_clicked, rate_limited, donate_clicked.
- `robots.txt` (disallow /api/), README with badges, MIT LICENSE.

**Deferred / user-side**
- Load test 50 concurrent: needs GITHUB_TOKEN (anonymous 60/h quota can't sustain it) — script-ready via `db:pre-analyze` pattern.
- Golden set is 10 repos (spec: 50) — grows via collect criteria once GITHUB_TOKEN allows sweeping.
- Launch checklist items (domain, GitHub org, social drafts, Umami dashboard) are user actions; asset swap-in (04) awaits Higgsfield credits.
