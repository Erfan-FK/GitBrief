/**
 * Fixture bundle for the landing "Live Example" section (01 §7).
 * Placeholder until M4 pipeline generates the real vercel/ai bundle —
 * shaped exactly like real output (M2 DoD allows fixture content).
 */

export const AGENTS_MD = `# vercel/ai — Agent Guide

TypeScript monorepo (pnpm + turbo). The AI SDK: providers, core, UI hooks.

## Commands
- \`pnpm install\` — install (pnpm 9, enforced via packageManager)
- \`pnpm build\` — turbo build all packages
- \`pnpm test\` — vitest across workspace
- \`pnpm lint\` / \`pnpm type-check\` — must pass before PR
- \`pnpm changeset\` — required for any package change

## Layout
- \`packages/ai\` — core SDK (\`generateText\`, \`streamText\`, tools)
- \`packages/@ai-sdk/*\` — provider adapters (openai, anthropic, google…)
- \`packages/react\` — \`useChat\`, \`useCompletion\` hooks
- \`examples/\` — runnable integration examples, one per framework

## Rules
- Never import between provider packages; shared code goes in \`packages/provider-utils\`.
- All public APIs need TSDoc + a changeset.
- Tests colocated as \`*.test.ts\`; providers mock HTTP, never hit APIs.
`;

export const CLAUDE_MD = `# CLAUDE.md — vercel/ai

pnpm + turbo monorepo. Node ≥18. Source of truth for APIs: \`packages/ai/src\`.

## Commands
- \`pnpm build\` · \`pnpm test\` · \`pnpm lint\` · \`pnpm type-check\`
- Single package: \`pnpm --filter ai test\`
- Docs dev server: \`pnpm --filter docs dev\`

## Conventions
- Changesets required (\`pnpm changeset\`) for package changes.
- Provider adapters implement \`LanguageModelV2\` from \`@ai-sdk/provider\`.
- No cross-provider imports. Shared helpers → \`provider-utils\`.
- Streaming internals use Web Streams; do not introduce Node streams.

> 14 commands verified against package.json scripts · 0 unverifiable claims
`;

export const SKILLS_TREE = [
  ".claude/skills/",
  "├── nextjs-15/SKILL.md",
  "├── react-19/SKILL.md",
  "├── typescript/SKILL.md",
  "└── zod-3/SKILL.md",
].join("\n");

export const SKILL_MD = `---
name: nextjs-15
description: Next.js 15 App Router conventions for this repo
---

# Next.js 15 (App Router)

Version in repo: **15.3.0** (from pnpm-lock.yaml).

## Do
- Server Components by default; add \`"use client"\` only for interactivity.
- Route handlers in \`app/api/*/route.ts\`; return \`NextResponse\`.
- \`next/font\` for fonts; \`display: swap\`.

## Don't
- No \`getServerSideProps\` / pages-router patterns — this repo is App Router.
- No \`next/head\`; use the Metadata API.

source: official · nextjs.org/docs · version-matched 15.x
`;

export const MCP_JSON = `{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "@vercel/mcp-server"],
      "env": { "VERCEL_TOKEN": "\${VERCEL_TOKEN}" }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "\${GITHUB_TOKEN}" }
    }
  }
}
`;

export interface GalleryEntry {
  repo: string;
  score: number;
  stack: string[]; // simple-icons slugs handled in gallery component
}

/** Fixture gallery until M5 backs it with the DB (01 §9). Two marquee rows —
 * mix of household names and smaller repos so the wall feels alive. */
export const GALLERY_FIXTURE: GalleryEntry[] = [
  { repo: "vercel/ai", score: 86, stack: ["typescript", "react", "nextdotjs", "vitest"] },
  { repo: "shadcn-ui/ui", score: 91, stack: ["react", "tailwindcss", "typescript", "radixui"] },
  { repo: "supabase/supabase", score: 84, stack: ["typescript", "postgresql", "react", "docker"] },
  { repo: "vercel/next.js", score: 88, stack: ["react", "typescript", "turbo", "rust"] },
  { repo: "shadcn-ui/taxonomy", score: 76, stack: ["nextdotjs", "typescript", "tailwindcss", "react"] },
  { repo: "colinhacks/zod", score: 83, stack: ["typescript", "vitest"] },
  { repo: "TanStack/query", score: 85, stack: ["typescript", "react", "vite"] },
  { repo: "hono/hono", score: 82, stack: ["typescript", "vitest"] },
  { repo: "fastapi/fastapi", score: 78, stack: ["python", "pydantic", "starlette"] },
  { repo: "gin-gonic/gin", score: 74, stack: ["go"] },
  { repo: "excalidraw/excalidraw", score: 71, stack: ["react", "typescript", "vite"] },
  { repo: "langchain-ai/langchain", score: 62, stack: ["python", "pydantic"] },
  { repo: "pallets/flask", score: 72, stack: ["python"] },
  { repo: "tokio-rs/axum", score: 79, stack: ["rust"] },
  { repo: "drizzle-team/drizzle-orm", score: 81, stack: ["typescript", "postgresql"] },
  { repo: "withastro/astro", score: 87, stack: ["typescript", "vite", "react"] },
];
