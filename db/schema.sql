-- gitbrief schema — 03 §1. Applied to Supabase as migration `initial_schema`.
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
  detection_json jsonb,
  score_json jsonb,
  error_code text,
  duration_detect_ms int,
  duration_total_ms int,
  large_repo_mode boolean default false,
  user_id uuid,
  created_at timestamptz default now(),
  unique(repo_id, commit_sha)
);
create index idx_analyses_repo_latest on analyses(repo_id, created_at desc);
create index idx_analyses_status on analyses(status) where status in ('detecting','briefing');

create type tech_category as enum ('framework','language','styling','database','auth','testing','infra','tooling','ai','uncategorized');

create table technologies (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  category tech_category not null,
  icon_ref text,
  homepage text,
  llms_txt_url text,
  mcp_server_json jsonb,
  created_at timestamptz default now()
);

create type rule_type as enum ('dependency','file','config-pattern');

create table detection_rules (
  id uuid primary key default uuid_generate_v4(),
  technology_id uuid not null references technologies(id) on delete cascade,
  rule_type rule_type not null,
  ecosystem text,
  pattern text not null,
  target_file_glob text,
  version_hint text,
  confidence smallint default 100
);
create index idx_rules_lookup on detection_rules(rule_type, pattern);

create type skill_kind as enum ('official','community');

create table skill_sources (
  id uuid primary key default uuid_generate_v4(),
  technology_id uuid not null references technologies(id) on delete cascade,
  kind skill_kind not null,
  url text not null,
  format text default 'skill-md',
  version_range text default '*',
  priority smallint default 1,
  last_verified_at timestamptz,
  broken boolean default false
);

create table generated_skills (
  id uuid primary key default uuid_generate_v4(),
  technology_id uuid not null references technologies(id) on delete cascade,
  version_range text not null,
  exact_version_seed text,
  content text not null,
  grounding_sources_json jsonb not null,
  verified_claims int,
  total_claims int,
  validated_at timestamptz default now(),
  unique(technology_id, version_range)
);

create table bundles (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references analyses(id) on delete cascade unique,
  zip_path text,
  total_token_count int,
  created_at timestamptz default now()
);

create type file_origin as enum ('official','generated','generated-cached','deterministic');
create type file_status as enum ('pending','complete','skipped');

create table bundle_files (
  id uuid primary key default uuid_generate_v4(),
  bundle_id uuid not null references bundles(id) on delete cascade,
  path text not null,
  content text,
  origin file_origin,
  status file_status not null default 'pending',
  skip_reason text,
  provenance_json jsonb,
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

-- RLS (03 §2)
alter table repos enable row level security;
alter table analyses enable row level security;
alter table technologies enable row level security;
alter table detection_rules enable row level security;
alter table skill_sources enable row level security;
alter table generated_skills enable row level security;
alter table bundles enable row level security;
alter table bundle_files enable row level security;
alter table feedback enable row level security;

create policy "anon read repos" on repos for select using (true);
create policy "anon read analyses" on analyses for select using (true);
create policy "anon read technologies" on technologies for select using (true);
create policy "anon read bundles" on bundles for select using (true);
create policy "anon read bundle_files" on bundle_files for select using (true);
create policy "anon insert feedback" on feedback for insert with check (true);
