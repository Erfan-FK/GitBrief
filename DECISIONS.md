# DECISIONS

Deviations from plan/00–04 specs, one line each with reason.

- M1: header mobile sheet menu (01 §3) deferred to M2 with shadcn install; M1 mobile header shows logo + GitHub + theme toggle only.
- M1: GitHub star count in header (01 §3) deferred — repo not public yet; plain GitHub icon link for now.
- M1: added `NEXT_PUBLIC_UMAMI_SRC` env (not in 00 §env list) — self-hosted Umami script URL unknown until deployed; defaults to Umami cloud.
- M1: Sentry init gated on DSN env vars so local/CI builds work without secrets; source-map upload only with `SENTRY_AUTH_TOKEN`.
- M1: placeholder inline-SVG logo mark until asset L2 (04) is produced.
- M1/M2: Vercel hosting dropped per user — hosting decided later; deploy DoD items deferred.
- M2: shadcn v4 generates Base UI (not Radix) components — accordion/sheet/tabs APIs adapted accordingly.
- M2: `/api/repos/resolve` uses unauthenticated GitHub API (60 req/h/IP); GitHub App token lands in M3, so 404 can't distinguish private from missing repo yet — both show not-found copy.
- M2: Playwright uses system Chrome (`channel: "chrome"`) — playwright.dev browser CDN geo-blocked on dev machine.
- M2: live example, gallery and score card use fixtures until M4/M5 (allowed by M2 DoD).
- M3: detection rules live in `src/lib/detect/registry.ts` (canonical) and are seeded INTO the DB — the fast path reads the in-memory registry, not the DB, for <3s latency; 02 §3 rule semantics unchanged.
- M3: GitHub access via optional `GITHUB_TOKEN` PAT (App installation token deferred); blob contents via raw.githubusercontent (no API rate cost). 404 private/missing indistinguishable until App token.
- M3: SSE endpoint is `/api/analyses/stream?owner=&repo=` — id-based route per 02 §1 arrives with the M4 Inngest pipeline; event names/shapes match spec.
- M3: Upstash Redis caching skipped (no creds); Next fetch-cache covers tree/meta TTLs. Analyses row caching active only when `SUPABASE_SERVICE_ROLE_KEY` set.
- M3: gin-gonic/gin detects as Go-only — the gin REPO doesn't depend on gin; library self-detection is out of detection scope (facts only).
- M4: tarball + @specfy/stack-analyser step stubbed — detection registry already covers the DoD repos; revisit if eval (M6) shows gaps.
- M4: deep path runs inline after the fast path in the SSE stream (interactive); Inngest function wraps the same pipeline for background jobs — no separate step-chain state since all steps are pure over fetched data.
- M4: zip built client-side (fflate) from streamed bundle; `/api/bundles/{id}/zip` + Storage upload deferred until service key + hosting exist.
- M4: skill generation grounding = vendor llms.txt only for now; Context7 API layer added when `CONTEXT7_API_KEY` is provisioned (MCP connector is dev-side, not runtime).
- M5: OG card falls back to a "not analyzed yet" variant when no persisted score (keyless dev).
- M5: gallery falls back to fixtures below 4 real analyses so the section is never empty.
- M6: rate limit falls back to per-process memory when Upstash creds absent (single-instance dev only; Upstash required before multi-instance deploy).
- M6: rate-limit quota consumed on fresh analysis runs only — cached replays and cache-hit reloads are free (01 §18 re-analyze still gated).
- M6: golden set starts at 10 repos; several high-profile CLAUDE.md files document conventions, not commands → command-coverage reads n/a for them (metric reported only where applicable).
- M6: CSP allows 'unsafe-inline' scripts — required by Next.js inline runtime; nonce-based CSP deferred to deploy hardening.
- Depth v2: FactSheet now carries role-sampled source files (≤7, secret-scrubbed, prompt-only — never persisted); CanonicalBrief schema rebuilt around purpose/how_it_works/key_modules/conventions-with-evidence; AGENTS.md is the full agent README, CLAUDE.md stays terse and points to it.
- Depth v2: brief generation moved to structured outputs (`output_config.format`, messages.parse) — freeform-JSON parse failures eliminated; `commands` crosses the wire as an array (records violate additionalProperties:false).
- Depth v2: generation model → claude-sonnet-5; it rejects non-default sampling params, so the temp-0.2 rule is satisfied by omission (structured outputs constrain instead).
- Depth v2: skills grounded via Context7 REST (search → docs) with a relevance gate — result title/id must contain the queried name (search returned better-auth for Auth.js); wrong-library grounding is discarded as worse than none.
- Depth v2: skill generation runs thinking-disabled, max_tokens 4500, 3-lane bounded concurrency — full-parallel fan-out dropped connections behind constrained networks and blew the wall clock (measured 76–147s/skill with thinking, 28–80s without).
- Depth v2: SSE job budget 120s → 300s (02 §11) — deep path now writes a brief + up to 10 grounded skills; measured taxonomy full run ≈ 3 min.
- Dev: Node fetch ignores HTTP(S)_PROXY; behind a local proxy/VPN the shared `anthropicClient()` hands the SDK undici's fetch + EnvHttpProxyAgent (same-build pairing required). No-op when proxy env absent.
