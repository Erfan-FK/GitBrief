# DEPLOY.md — env keys: where to find each, how to write them

Every variable from `.env.example`, in dependency order. **Local dev:** put
them in `.env.local` (git-ignored). **Production:** enter them in your
host's environment-variables UI (never commit them).

Priority tiers — the app runs with ZERO keys (deterministic briefs, no
caching); each tier unlocks more:

| Tier | Keys | Unlocks |
|---|---|---|
| 1 — core product | `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | LLM briefs + grounded skills; caching, gallery, OG scores |
| 2 — scale | `GITHUB_TOKEN` (or GitHub App trio), `UPSTASH_*` | API quota for real traffic; multi-instance rate limits |
| 3 — ops | `SENTRY_*`, `NEXT_PUBLIC_UMAMI_*`, `INNGEST_*` | error tracking, analytics, background jobs |
| optional | `CONTEXT7_API_KEY` | extra skill grounding beyond llms.txt |

---

## 1. ANTHROPIC_API_KEY

1. Go to <https://console.anthropic.com> → sign in.
2. Left sidebar → **API Keys** → **Create Key**. Name it `gitbrief-prod`.
3. Copy the `sk-ant-…` value shown ONCE.

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx
```

Used by: brief generation (Sonnet) + skill generation. Without it every
brief is the deterministic facts-only variant.

## 2. Supabase (4 values — project already exists: `gitbrief`, ref `tuzeneuwymvoygtxsaui`)

1. <https://supabase.com/dashboard> → project **gitbrief**.
2. **Settings → API**:
   - *Project URL* → both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - *anon / publishable key* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *service_role key* (click reveal; treat like a password — server only,
     bypasses RLS) → `SUPABASE_SERVICE_ROLE_KEY`

```
SUPABASE_URL=https://tuzeneuwymvoygtxsaui.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://tuzeneuwymvoygtxsaui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   (already in .env.local)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        (dashboard → reveal)
```

After setting the service key locally, seed + warm the cache:
`pnpm dev` in one terminal, `pnpm db:pre-analyze` in another.

## 3. GitHub access

**Quick path (fine for launch):** a classic Personal Access Token.
1. <https://github.com/settings/tokens> → **Generate new token (classic)**.
2. Scopes: `public_repo` only. Expiry 90 days.
```
GITHUB_TOKEN=ghp_xxxxxxxx
```
(This var replaces the App trio until you outgrow 5 000 req/h.)

**Spec path (GitHub App — higher limits, per-install tokens):**
1. <https://github.com/settings/apps> → **New GitHub App**.
   - Name `gitbrief`, homepage `https://gitbrief.dev`, uncheck Webhook.
   - Repository permissions: **Contents: Read-only**, **Metadata: Read-only**.
2. After creating: the **App ID** is on the app page → `GITHUB_APP_ID`.
3. **Generate a private key** (same page, bottom) — downloads a `.pem`:
   - `GITHUB_APP_PRIVATE_KEY` = the full PEM contents with real newlines
     replaced by `\n` (one line), e.g.
     `-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----`
4. **Install App** (left menu) → install on your account (all public repos).
   The number at the end of the resulting URL
   `…/settings/installations/12345678` → `GITHUB_APP_INSTALLATION_ID`.

## 4. Upstash Redis (rate limiting)

1. <https://console.upstash.com> → **Create Database** → Redis, region
   closest to your host (eu-west-1 to match Supabase), free tier.
2. Database page → **REST API** section:

```
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

Without these the limiter falls back to per-instance memory — fine for one
server, wrong for serverless/multi-instance.

## 5. Inngest (background jobs)

Local dev needs no keys — run `npx inngest-cli dev` beside `pnpm dev`.
For production:
1. <https://app.inngest.com> → create app `gitbrief`.
2. Settings → **Event Keys** → copy default → `INNGEST_EVENT_KEY`.
3. Settings → **Signing Key** → copy → `INNGEST_SIGNING_KEY`.
4. After deploy, register the endpoint: `https://<your-domain>/api/inngest`.

## 6. Sentry (errors)

1. <https://sentry.io> → create project → platform **Next.js**.
2. The DSN is shown at the end of setup (or Settings → Client Keys):

```
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/123
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/123   (same value)
```
3. `SENTRY_AUTH_TOKEN` (optional — uploads sourcemaps in CI):
   Sentry → Settings → **Auth Tokens** → create with `project:releases` +
   `org:read`. Set it only in CI/host env, never NEXT_PUBLIC.

## 7. Umami (analytics, cookie-free)

Two options:
- **Umami Cloud** (fastest): <https://cloud.umami.is> → Add website
  (`gitbrief.dev`) → copy the **Website ID**:
  ```
  NEXT_PUBLIC_UMAMI_ID=xxxxxxxx-xxxx-...
  NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
  ```
- **Self-hosted**: deploy `umami-software/umami` (one-click on most hosts,
  needs a Postgres), add the website there, then set `NEXT_PUBLIC_UMAMI_SRC`
  to `https://<your-umami-domain>/script.js`.

The tracking script only renders when `NEXT_PUBLIC_UMAMI_ID` is set, and the
CSP automatically allows whatever origin `NEXT_PUBLIC_UMAMI_SRC` points to.

## 8. CONTEXT7_API_KEY (optional)

<https://context7.com> → sign in → Dashboard → API Keys. Skill grounding
degrades to vendor `llms.txt` without it (current default).

---

## Deploy checklist (any Node host — hosting decision pending)

1. **Build check locally:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all green today.
2. Create the host project from the GitHub repo `Erfan-FK/GitBrief`,
   build command `pnpm build`, output: Next.js standalone/server.
3. Paste tier-1 env vars minimum (Anthropic + all 4 Supabase). Add the rest
   as you provision them.
4. Deploy, then:
   - visit `/` — landing; `/vercel/ai` — live analysis
   - `curl -I https://<domain>` — CSP + security headers present
   - `/api/og/vercel/ai` — OG card renders
   - `/sitemap.xml`, `/robots.txt`
5. Register Inngest endpoint (step 5 above) if using background jobs.
6. Warm the gallery: `SUPABASE_SERVICE_ROLE_KEY=… pnpm db:pre-analyze https://<domain>`.
7. Point DNS: `gitbrief.dev` → host; add `gitbriefs.com` 301 redirect.
8. Social debugger pass: paste `https://<domain>/vercel/ai` into
   <https://cards-dev.twitter.com/validator> and the Facebook Sharing
   Debugger — the OG card should show the score ring.
9. Lighthouse: `npx lighthouse https://<domain> --view` — targets
   Perf ≥95 / A11y 100 / SEO 100 (00 M1/M2 DoD).
