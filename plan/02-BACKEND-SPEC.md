# 02-BACKEND-SPEC — gitbrief pipeline, APIs, prompts, validators

## 1. API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/repos/resolve` | POST `{input}` | Normalize any user input → `{owner, repo, branch?}` or 422. Accepts full URLs, `owner/repo`, `/tree|/blob` deep links, `.git`, `www.` |
| `/api/analyses` | POST `{owner, repo}` | Rate-limit check → find-or-create repo row → cache check by `head_sha` → hit: return `{analysis, cached:true}`; miss: create row(status=`detecting`), fire Inngest `analysis/requested`, return `{analysisId}` |
| `/api/analyses/{id}/stream` | GET (SSE) | Fast-path detection events (fallback when Realtime unavailable). Events: `manifest`, `tech`, `detection_complete`, `error` |
| `/api/analyses/{id}` | GET | Full analysis JSON (detection, score, bundle file index, statuses) |
| `/api/bundles/{id}/zip` | GET | Signed redirect to Supabase Storage zip |
| `/api/bundles/{id}/prompt` | GET | Concatenated one-prompt text (file-path headers, token count trailer) |
| `/api/og/{owner}/{repo}` | GET | Satori score card 1200×630 |
| `/api/gallery` | GET | Top analyzed repos (cached 1h) |
| `/api/feedback` | POST `{bundleFileId, vote}` | Thumbs up/down, IP-deduped |
| `/api/inngest` | * | Inngest handler |

Zod schemas for every request/response in `lib/contracts.ts`. Errors: RFC7807 shape `{type,title,status,detail}`.

## 2. Fast path (synchronous, target <3s p50)

1. `resolve` → GitHub App token → `GET /repos/{o}/{r}` (meta; 404 → not_found|private).
2. `GET /repos/{o}/{r}/git/trees/{head_sha}?recursive=1` (one call; if `truncated:true` → mark `largeRepo`, manifest-only mode).
3. From the tree, select candidate files by exact name/pattern — fetch AT MOST 30 blobs, priority order:
   root manifests (`package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`(skip parse, flag bun), `requirements.txt`, `pyproject.toml`, `poetry.lock`, `uv.lock`, `Pipfile.lock`, `go.mod`, `go.sum`, `Cargo.toml`, `Cargo.lock`, `composer.json`, `composer.lock`, `Gemfile.lock`, `*.csproj`(first 3), `pom.xml`, `build.gradle*`, `pubspec.yaml`, `mix.exs`) → workspace configs (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, workspaces field) → framework/config signals (`next.config.*`, `nuxt.config.*`, `vite.config.*`, `astro.config.*`, `svelte.config.*`, `remix.config.*`, `tailwind.config.*`, `postcss.config.*`, `components.json`, `tsconfig.json`, `drizzle.config.*`, `prisma/schema.prisma`, `supabase/config.toml`, `firebase.json`, `Dockerfile`, `docker-compose*`, `.github/workflows/*.yml`(count only), `Makefile`, `justfile`, `Taskfile.yml`) → existing agent files (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/**`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`) → `README.md` (first 400 lines).
4. Run detection rules (§3) over fetched content + tree paths. Stream each result as SSE/Realtime event immediately.
5. `GET /repos/{o}/{r}/languages` → language stats.
6. Persist `detection_json` on the analysis row; status → `briefing`; emit `detection_complete {counts, durationMs}`.

Redis keys: `repo-meta:{o}/{r}` TTL 10m · `tree:{o}/{r}@{sha}` TTL 24h · GitHub rate-remaining gauge.

## 3. Detection engine (`lib/detect`)

Layer 1 — **dependency rules**: parse manifests → `{ecosystem, name, versionRange}` per dep. Exact installed versions come ONLY from lockfiles (Layer 3). Map `name` → technology via `detection_rules(rule_type='dependency')`.
Layer 2 — **file/config rules**: `rule_type='file'` (path glob, e.g. `components.json` → shadcn; `supabase/**` → supabase) and `rule_type='config-pattern'` (regex over a fetched file, e.g. `"@tailwindcss/postcss"` in postcss config → tailwind v4 signal).
Layer 3 — **version extraction** (`lib/detect/lockfiles.ts`): pnpm-lock (yaml, `importers.*.dependencies[name].version` strip peer suffix), package-lock v2/3 (`packages["node_modules/{name}"].version`), yarn classic+berry, poetry.lock, uv.lock, Cargo.lock, go.mod (require lines + go.sum confirm), composer.lock, Gemfile.lock. Output `exactVersion`; if only a range exists, store range with `confidence:'range'`.
Layer 4 — **disambiguators** (versioned tech variants, drive skill choice): tailwind 3 vs 4 (major from lockfile + postcss signal), next pages vs app router (`app/` dir with `layout.*` in tree), react major, prisma vs drizzle coexistence, package manager (lockfile present > packageManager field > engines).
Layer 5 — **monorepo**: workspace globs → per-package detection maps `{packagePath → techs[]}`; root aggregates unique.
Deep path additionally runs `@specfy/stack-analyser` on the tarball; merge = union, prefer OUR version data on conflict; anything it finds that we lack a `technologies` row for → insert with `category:'uncategorized'`, log for curation.
Every detection carries `evidence: [{file, kind, excerpt≤120ch}]` — powers UI tooltips and provenance.

## 4. Existing-config awareness
If repo already has CLAUDE.md/AGENTS.md/rules: parse; extract claimed commands (backtick tokens matching `^(npm|pnpm|yarn|bun|make|just|cargo|go|pytest|uv|poetry|composer|rails|mix) `), claimed paths. Verify against scripts/tree. Attach `existingConfigAudit: {file, staleClaims[]}` to detection. UI shows an amber `existing config: {n} stale claims` chip; generated CLAUDE.md includes a one-line `> Replaces stale {file} ({n} outdated references)` header ONLY when n>0.

## 5. Deep path — Inngest function `analysis/run`
Steps (each `step.run`, auto-retry 3× exp backoff; per-step timeout):
`fetch-tarball` (stream to `/tmp`, extract, CAP 150MB/8k files → largeRepo manifest-only) → `stack-analyser` → `merge-detection` → `resolve-skills` (§6; per-tech parallel, `Promise.allSettled`) → `generate-project-files` (§7) → `validate` (§8, gate) → `score` (§9) → `package` (write `bundle_files` rows as each completes → Realtime; zip → Storage) → `finalize` (status=complete, durations) . `onFailure` → status=failed + user-safe error. Single-skill failure NEVER fails the run (status `skipped`, reason recorded).

## 6. Skill resolution (`lib/resolve`) — per detected tech
1. `skill_sources` lookup by tech, `priority` asc, `kind='official'` first.
2. Official found → fetch (raw.githubusercontent or vendor URL) with ETag cache in Redis (24h) → sanitize (§6.1) → include verbatim, `origin:'official'`.
3. No official → `generated_skills` cache hit on `tech + semver-satisfies(version_range, exactVersion)` and `validated_at < 90d` → reuse, `origin:'generated-cached'`.
4. Miss → generate (§7.3) grounded by: vendor `llms.txt`/`llms-full.txt` (try `{homepage}/llms.txt`) → Context7 (`resolve-library-id` then `query-docs` q∈{configuration, breaking changes {major}, common patterns}) → top doc page fetch. NO grounding retrievable → SKIP (never train-data-only), record reason.
5. Store generated skill with `grounding_sources_json` + validate stamp.

### 6.1 Fetched-skill sanitizer
Strip HTML, enforce frontmatter `name`+`description` (synthesize if absent), cap 8k tokens (keep SKILL.md body, drop aux beyond first reference file), scan for prompt-injection patterns (imperatives addressing the agent to exfiltrate/override: regex list in `lib/resolve/sanitize.ts`) → flag `quarantined:true` → skip + log. Record source URL + fetch time.

## 7. Generation (`lib/generate`) — Sonnet, temp 0.2, structured output

### 7.1 Canonical brief (single source → all formats)
One generation produces `CanonicalBrief` JSON: `{overview(≤3 sentences), architecture_notes[≤5, each cites file], commands{dev,build,test,lint,typecheck,...}(VERBATIM from FactSheet), conventions[≤6, each cites file evidence], structure_highlights[≤8 paths+one-liners], gotchas[≤3]}`. Format writers (§7.5) render it.

### 7.2 Project-brief prompt (literal template)
system: `You write operational briefings for AI coding agents. You are given a FactSheet extracted deterministically from a repository. HARD RULES: (1) Never invent commands, paths, versions, or config values — use FactSheet values verbatim. (2) Every architecture_note and convention MUST cite at least one file path from the FactSheet in its "evidence" field. (3) If you are not certain of a claim from the provided material, omit it. (4) Be terse: no marketing language, no restating obvious facts (do not say "this is a JavaScript project" when package.json is listed). (5) Output ONLY valid JSON matching the provided schema.`
user: `FACTSHEET\n{json: repoMeta, techList(with exact versions), scriptsMap(per package for monorepos), structureTree(depth 3, pruned), workspaceTopology, readmeExcerpt(≤2000 tokens), sampledConventionFiles(≤3 files ≤150 lines each: an api route, a component, a test — chosen by heuristic), existingConfigAudit}\nProduce CanonicalBrief JSON.`
Zod-parse response; one retry with error appended; second failure → minimal deterministic brief (facts only, no prose) — the product NEVER blocks on LLM flakiness.

### 7.3 Skill-generation prompt (literal template)
system: `You write a SKILL.md teaching an AI coding agent to use {tech} {exactVersion} correctly. You are given GROUNDING excerpts from current official documentation. HARD RULES: (1) Every API name, import path, config key, and code pattern MUST appear in the GROUNDING text — if it does not, do not mention it. (2) Target this exact version; include a "version notes" section ONLY if grounding shows breaking changes from the previous major. (3) ≤2500 tokens. (4) Structure: YAML frontmatter (name: {tech}-{major}, description: one sentence with WHEN to use), then: Setup/Config as used in this stack, Core patterns (3-5, code blocks), Common mistakes (from grounding only), References (source URLs). (5) Markdown only.`
user: `TECH: {tech}@{exactVersion} · CONTEXT: used with {co-occurring stack}\nGROUNDING:\n{ranked excerpts, ≤6000 tokens, each tagged [source: url]}`

### 7.4 Post-generation fact-check (skills)
Haiku extractor pulls all claimed identifiers (imports, config keys, CLI commands, API names) → string/fuzzy match against grounding corpus → unmatched: strip the containing bullet/block; if >30% stripped → discard skill, mark skipped(`low-grounding`). Store `verified/total` counts for provenance.

### 7.5 Format writers (pure functions, `lib/generate/writers/`)
`writeAgentsMd(brief)` — spec-standard sections; `writeClaudeMd(brief)` — same content, CC conventions (commands early, `## Commands` first), ≤120 lines target; `writeCursorRules(brief)` — single `.cursor/rules/gitbrief.mdc`, frontmatter `description` + `alwaysApply: true`; `writeMcpJson(detection)` — from `technologies.mcp_server_json` for detected techs w/ servers (supabase, stripe, sentry…), per-client note comment; `writeIgnore(tree)` — build/vendor/generated dirs present in THIS tree only. Writer interface takes `(brief, detection)` → future Windsurf/Gemini writers plug in (v2, do not build).

## 8. Validator gate (`lib/validate`) — runs on EVERY output file, blocking
- **commands**: every backtick command token → exists in scriptsMap (or Makefile/justfile targets) else strip line; count stripped.
- **paths**: every path-like token (`^[\w.@-]+/[\w./@-]+$` heuristic + exists-check) → in tree else strip.
- **versions**: every `{knownTech}@{semver}` or "v{major}" claim → matches detection else rewrite to detected or strip.
- **links**: markdown links → https + domain allowlist (github.com, vendor domains from skill_sources, docs domains from grounding).
- Frontmatter validity for skills; total bundle token count computed (tiktoken) and stored.
Result per file: `{verifiedCommands, strippedClaims, checks[]}` → provenance footer + score input. Unit tests MUST include a planted-hallucination fixture proving the gate strips it.

## 9. Readiness Score (deterministic, transparent)
100 pts: existing AGENTS.md or CLAUDE.md present 15 (fresh: no stale claims +5 of these) · scripts documented (dev+build+test exist) 15 · lockfile present 10 · tests detected (framework + test files) 10 · CI workflow 10 · README ≥ 30 lines 5 · ignore file for AI tools 5 · typed language or typecheck script 5 · declared engines/runtime 5 · official skills available for ≥50% of stack 10 · monorepo topology declared (if monorepo) 5 · LICENSE 5. Bands: ≥80 success · 50–79 warning · <50 destructive. Each item: `{pass, points, fixHint}` → modal + `Copy fix list`.

## 10. Eval harness (`eval/`) — built in M6, run in CI on prompt/rule changes
`eval/golden.json`: 50 repos WITH developer-written AGENTS.md/CLAUDE.md (script `eval/collect.ts` finds candidates: >500 stars, agent file >40 lines, committed by repo owner). Runner: analyze each (ignoring their agent file as input) → compare ours vs theirs: command coverage (% of their documented commands we found), path accuracy (0 invented paths — hard fail), section coverage, length ratio, LLM-judge rubric (Haiku, 1–5 on operational usefulness, judged blind both directions). Output `eval/report.md` with per-repo table + aggregates. Regression rule: command coverage or path accuracy drop >2pts vs committed baseline → CI fails.

## 11. Security & privacy
GitHub App key server-only; tarballs in ephemeral `/tmp`, deleted in `finally`; NEVER persist source file contents — only manifests' parsed data, evidence excerpts ≤120ch, and generated outputs; secret-scan evidence excerpts (regex: keys/tokens patterns) before storing; fetched skills sanitized (§6.1); LLM inputs contain no secrets by construction (FactSheet is parsed data); rate limit 10/day/IP (Upstash sliding window) + global concurrency cap 10 deep jobs; per-job wall clock 120s budget → largeRepo degrade; CSP strict, no third-party scripts except Umami.

## 12. Analytics events (Umami custom events)
`analyze_submitted {source: bar|chip|urlswap}` · `analysis_completed {cached, durationMs, techCount}` · `bundle_downloaded` · `prompt_copied` · `file_copied {file}` · `score_viewed` · `share_clicked` · `donate_clicked` · `feedback {vote}` · `rate_limited`. Funnel of record: submitted → completed → downloaded|copied.
