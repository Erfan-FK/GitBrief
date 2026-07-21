<div align="center">

<img src="src/app/icon.svg" width="88" alt="gitbrief logo" />

# gitbrief

**Make any repo agent-ready in one paste.**

[![CI](https://github.com/Erfan-FK/GitBrief/actions/workflows/ci.yml/badge.svg)](https://github.com/Erfan-FK/GitBrief/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-6D4AFF.svg)](LICENSE)

Paste a GitHub URL → get a verified briefing bundle your AI coding agents
actually understand: `AGENTS.md`, `CLAUDE.md`, editor rules, version-matched
skills, and a readiness score.

</div>

---

## What you get

| File | What it does |
|---|---|
| `AGENTS.md` | The full "README for agents" — what the repo is, how it works, commands, project map, conventions, gotchas |
| `CLAUDE.md` | Terse, command-first memory file for Claude Code |
| `.cursor/rules/` | The same rules, packaged for Cursor |
| `.claude/skills/*/SKILL.md` | Version-matched skills for your stack — Next.js 13 gets Next.js 13 docs, not 15 |
| `.mcp.json` | MCP server suggestions matched to your stack |
| **Readiness score** | 0–100 with per-item fix hints — what's missing before an agent can work your repo well |

## Why it's trustworthy

- **Facts before generation.** Lockfiles, manifests, and configs are parsed
  deterministically — versions come from your lockfile, never from guesswork.
- **Grounded in your code.** The generator reads real sampled source files
  from the repo, so briefs describe what the code *does*, not what the README
  promises.
- **Verify or delete.** Every command, path, and version in the output is
  checked against the actual repo — anything unverifiable is stripped, and
  every file shows its verification counts.
- **Current docs, right version.** Skills are grounded in official vendor
  skills, `llms.txt`, or live documentation for the exact major version you
  ship — never training-data folklore.
- **Your code stays yours.** Source excerpts are used in-memory during
  analysis and never stored. See [Privacy](https://gitbrief.dev/privacy).

## How it works

```
paste URL → detect stack (lockfiles, manifests, configs)
          → sample key source files
          → generate one canonical brief (Claude)
          → validate every claim against the repo
          → score readiness → download the bundle
```

Results stream live, and finished analyses are cached — the second visitor
gets the bundle instantly.

## Built with

Next.js 15 · Claude API (structured outputs) · Supabase · Tailwind v4

---

<div align="center">

MIT · Not affiliated with GitHub, Inc. · Built by [Erfan](https://github.com/Erfan-FK)

</div>
