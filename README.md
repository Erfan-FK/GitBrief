# gitbrief

[![CI](https://github.com/Erfan-FK/GitBrief/actions/workflows/ci.yml/badge.svg)](https://github.com/Erfan-FK/GitBrief/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-6D4AFF.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)

Paste a GitHub repo URL — get a verified agent-readiness bundle: `CLAUDE.md`,
`AGENTS.md`, `.cursor/rules`, version-matched `SKILL.md` files, `.mcp.json`
suggestions and an ignore file — plus a shareable Readiness Score.

Or swap `github.com` → `gitbrief.dev` in any repo URL.

## Why it's different

1. **Facts before generation.** Lockfiles, scripts and configs are parsed
   deterministically; the LLM only writes connective tissue.
2. **Verify or delete.** Every command, path and version in the output passes
   a validator gate against your actual repo — or it's stripped.
3. **Official first.** Vendor-shipped skills (Supabase, Anthropic, …) are
   fetched verbatim; we only generate when nothing official exists, grounded
   in current docs.
4. **Provenance everywhere.** Every file shows its sources and verification
   counts.

## Development

```bash
pnpm install
pnpm dev            # Next.js dev server
pnpm test           # vitest unit tests
pnpm test:e2e       # Playwright (uses system Chrome)
pnpm lint && pnpm typecheck
pnpm eval           # golden-set eval → eval/report.md
pnpm db:seed        # seed technologies + detection rules
pnpm db:pre-analyze # pre-analyze the top-30 gallery repos
```

Copy `.env.example` → `.env.local`. Works with zero secrets (deterministic
briefs, no caching); add `ANTHROPIC_API_KEY` for LLM briefs and
`SUPABASE_SERVICE_ROLE_KEY` for caching + gallery persistence.

## Architecture

Single Next.js 15 app. `src/lib`: `github/` client · `detect/` rule engine +
lockfile parsers · `generate/` FactSheet → CanonicalBrief → format writers ·
`resolve/` skill resolution + sanitizer · `validate/` the gate · `score/`
readiness score. Pipeline streams over SSE; Supabase caches by
`repo@head_sha`. Specs in `plan/`.

## License

MIT — not affiliated with GitHub, Inc.
