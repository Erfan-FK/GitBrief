# DECISIONS

Deviations from plan/00–04 specs, one line each with reason.

- M1: header mobile sheet menu (01 §3) deferred to M2 with shadcn install; M1 mobile header shows logo + GitHub + theme toggle only.
- M1: GitHub star count in header (01 §3) deferred — repo not public yet; plain GitHub icon link for now.
- M1: added `NEXT_PUBLIC_UMAMI_SRC` env (not in 00 §env list) — self-hosted Umami script URL unknown until deployed; defaults to Umami cloud.
- M1: Sentry init gated on DSN env vars so local/CI builds work without secrets; source-map upload only with `SENTRY_AUTH_TOKEN`.
- M1: placeholder inline-SVG logo mark until asset L2 (04) is produced.
