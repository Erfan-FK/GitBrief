# 03-DB-SPEC — Supabase Postgres schema & seed

## 1. Schema (execute as migration 0001)

```sql
create extension if not exists "uuid-ossp";

create table repos (
  id uuid primary key default uuid_generate_v4(),
  owner text not null,
  name text not null,
  default_branch text not null default 'main',
  stars int default 0,
  avatar_url text,
  primary_language text,
  is_monorepo boolean default false,
  first_analyzed_at timestamptz,
  updated_at timestamptz default now(),
  unique(owner, name)
);

create type analysis_status as enum ('detecting','briefing','complete','failed');

create table analyses (
  id uuid primary key default uuid_generate_v4(),
  repo_id uuid not null references repos(id) on delete cascade,
  commit_sha text not null,
  status analysis_status not null default 'detecting',
  detection_json jsonb,          -- techs, versions, evidence, manifests, workspaces, existingConfigAudit
  score_json jsonb,              -- total, band, items[{key,pass,points,fixHint}]
  error_code text,               -- user-safe: not_found|too_large|timeout|internal
  duration_detect_ms int,
  duration_total_ms int,
  large_repo_mode boolean default false,
  user_id uuid,                  -- nullable; Phase-1 billing readiness. NO FK yet.
  created_at timestamptz default now(),
  unique(repo_id, commit_sha)    -- the cache key
);
create index idx_analyses_repo_latest on analyses(repo_id, created_at desc);
create index idx_analyses_status on analyses(status) where status in ('detecting','briefing');

create type tech_category as enum ('framework','language','styling','database','auth','testing','infra','tooling','ai','uncategorized');

create table technologies (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,       -- 'nextjs','tailwind','supabase'
  name text not null,
  category tech_category not null,
  icon_ref text,                   -- simple-icons slug
  homepage text,
  llms_txt_url text,               -- direct llms.txt if known
  mcp_server_json jsonb,           -- ready-to-emit server block, null if none
  created_at timestamptz default now()
);

create type rule_type as enum ('dependency','file','config-pattern');

create table detection_rules (
  id uuid primary key default uuid_generate_v4(),
  technology_id uuid not null references technologies(id) on delete cascade,
  rule_type rule_type not null,
  ecosystem text,                  -- npm|pypi|cargo|go|composer|gem|maven|null
  pattern text not null,           -- dep name | path glob | regex
  target_file_glob text,           -- for config-pattern: which file to scan
  version_hint text,               -- e.g. 'major>=4 → tailwind-v4 variant'
  confidence smallint default 100
);
create index idx_rules_lookup on detection_rules(rule_type, pattern);

create type skill_kind as enum ('official','community');

create table skill_sources (
  id uuid primary key default uuid_generate_v4(),
  technology_id uuid not null references technologies(id) on delete cascade,
  kind skill_kind not null,
  url text not null,               -- raw fetchable SKILL.md (or dir README)
  format text default 'skill-md',
  version_range text default '*',  -- semver range this source covers
  priority smallint default 1,     -- asc = first
  last_verified_at timestamptz,
  broken boolean default false
);

create table generated_skills (
  id uuid primary key default uuid_generate_v4(),
  technology_id uuid not null references technologies(id) on delete cascade,
  version_range text not null,     -- '~4.1' style: reuse window
  exact_version_seed text,         -- version it was generated against
  content text not null,
  grounding_sources_json jsonb not null,  -- [{url, fetchedAt, kind:llms|context7|docs}]
  verified_claims int,
  total_claims int,
  validated_at timestamptz default now(),
  unique(technology_id, version_range)
);

create table bundles (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references analyses(id) on delete cascade unique,
  zip_path text,                   -- storage path
  total_token_count int,
  created_at timestamptz default now()
);

create type file_origin as enum ('official','generated','generated-cached','deterministic');
create type file_status as enum ('pending','complete','skipped');

create table bundle_files (
  id uuid primary key default uuid_generate_v4(),
  bundle_id uuid not null references bundles(id) on delete cascade,
  path text not null,              -- 'CLAUDE.md', '.claude/skills/tailwind-v4/SKILL.md'
  content text,
  origin file_origin,
  status file_status not null default 'pending',
  skip_reason text,
  provenance_json jsonb,           -- {sources[], verifiedCommands, strippedClaims, fetchedAt}
  token_count int,
  sort_order smallint,
  unique(bundle_id, path)
);
create index idx_bundle_files_bundle on bundle_files(bundle_id, sort_order);

create table feedback (
  id uuid primary key default uuid_generate_v4(),
  bundle_file_id uuid not null references bundle_files(id) on delete cascade,
  vote smallint not null check (vote in (-1,1)),
  ip_hash text not null,
  created_at timestamptz default now(),
  unique(bundle_file_id, ip_hash)
);
```

## 2. RLS
Enable RLS on all tables. Anon key: SELECT on `repos, analyses(status,detection_json,score_json...), bundles, bundle_files, technologies`; INSERT on `feedback` only. All writes via service role (API routes / Inngest). Realtime: publication on `analyses` (status changes) + `bundle_files` (inserts/updates) — filtered client-side by ids.

## 3. Storage
Bucket `bundles` (private). Path `bundles/{analysisId}.zip`. Signed URLs 10-min expiry via `/api/bundles/{id}/zip`.

## 4. Seed — technologies, rules, skill sources (`db/seed/`)
Seed as TypeScript objects → upsert script (`pnpm db:seed`). Full list to seed (slug · category · dependency-rule pattern(s) · file rules · official skill source if known):

**Frameworks:** nextjs (`next`; next.config.*) · react (`react`) · vue (`vue`) · nuxt (`nuxt`) · svelte/sveltekit (`svelte`,`@sveltejs/kit`) · astro (`astro`) · remix (`@remix-run/*`) · express (`express`) · fastify (`fastify`) · hono (`hono`) · nestjs (`@nestjs/core`) · django (pypi `django`; manage.py) · fastapi (pypi `fastapi`) · flask (pypi `flask`) · rails (gem `rails`) · laravel (composer `laravel/framework`) · gin (go `github.com/gin-gonic/gin`) · spring (maven `org.springframework*`).
**Languages/runtimes:** typescript (`typescript`; tsconfig.json) · python (pyproject/requirements) · go (go.mod) · rust (Cargo.toml) · php · ruby · java · node (engines) · bun (bun.lockb) · deno (deno.json).
**Styling/UI:** tailwind (`tailwindcss`; tailwind.config.*; config-pattern `@tailwindcss/postcss` in postcss → v4 variant) — llms: tailwindcss.com/llms.txt · shadcn (file `components.json`) — OFFICIAL skill: ui.shadcn.com/docs/skills (fetch per their distribution; also npx shadcn skill path) · radix (`@radix-ui/*`) · mui (`@mui/material`) · chakra (`@chakra-ui/react`) · styled-components · sass · framer-motion (`framer-motion`,`motion`).
**Database/ORM:** supabase (`@supabase/supabase-js`; dir `supabase/`) — OFFICIAL: github.com/supabase/agent-skills (raw SKILL.md paths) + mcp_server_json `{command:"npx",args:["-y","@supabase/mcp-server-supabase"]}` · prisma (`prisma`,`@prisma/client`; prisma/schema.prisma) · drizzle (`drizzle-orm`; drizzle.config.*) · mongoose (`mongoose`) · sqlalchemy (pypi) · postgres/mysql/sqlite/redis (drivers: `pg`,`mysql2`,`better-sqlite3`,`redis`,`ioredis`) · upstash (`@upstash/redis`).
**Auth:** nextauth (`next-auth`,`@auth/*`) · clerk (`@clerk/*`) · better-auth (`better-auth`) · lucia (`lucia`) · supabase-auth (via supabase).
**Testing:** vitest · jest · playwright · cypress · pytest (pypi) · testing-library (`@testing-library/*`).
**Infra/tooling:** docker (Dockerfile) · vercel (vercel.json) · turborepo (turbo.json) · nx (nx.json) · pnpm/yarn/npm (lockfiles) · eslint · prettier · biome (`@biomejs/biome`) · storybook (`storybook`,`.storybook/`) · trpc (`@trpc/*`) · zod (`zod`) · stripe (`stripe`) + mcp_server_json · sentry (`@sentry/*`) + mcp_server_json.
**AI:** anthropic sdk (`@anthropic-ai/sdk`; pypi `anthropic`) — official docs llms.txt · openai sdk · vercel-ai (`ai`) — sdk.vercel.ai llms.txt · langchain (js+py).

For every seeded tech WITHOUT an official skill source, generation path covers it — do NOT seed community sources in v1 except: anthropics/skills repo entries where directly applicable. Seed also `eval-repos.json` (M6) and **gallery pre-analyze list** (top 30): vercel/next.js, vercel/ai, shadcn-ui/ui, supabase/supabase, facebook/react, vuejs/core, sveltejs/kit, withastro/astro, tailwindlabs/tailwindcss, fastapi/fastapi, django/django, pallets/flask, gin-gonic/gin, rust-lang/cargo, prisma/prisma, drizzle-team/drizzle-orm, honojs/hono, nestjs/nest, remix-run/remix, expressjs/express, upstash/context7, anthropics/anthropic-sdk-typescript, openai/openai-node, langchain-ai/langchainjs, colinhacks/zod, TanStack/query, pmndrs/zustand, vitest-dev/vitest, microsoft/playwright, t3-oss/create-t3-app.

## 5. Maintenance jobs (Inngest cron)
Nightly: re-verify `skill_sources` URLs (HEAD; mark `broken`) · refresh gallery repos if head moved (cheap fast-path only) · purge `analyses` older than 90d for repos with a newer analysis (keep latest per repo) · recompute `generated_skills` older than 90d ONLY on next demand (lazy, not proactive).
