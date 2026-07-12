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
