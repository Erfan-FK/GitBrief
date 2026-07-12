/**
 * Pre-analyze the top-30 gallery repos (03 §4 list) by driving the local
 * pipeline endpoint. Requires: dev server running + SUPABASE_SERVICE_ROLE_KEY
 * set (so results persist). Usage: pnpm db:pre-analyze [baseUrl]
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const REPOS = [
  "vercel/next.js", "vercel/ai", "shadcn-ui/ui", "supabase/supabase",
  "facebook/react", "vuejs/core", "sveltejs/kit", "withastro/astro",
  "tailwindlabs/tailwindcss", "fastapi/fastapi", "django/django",
  "pallets/flask", "gin-gonic/gin", "rust-lang/cargo", "prisma/prisma",
  "drizzle-team/drizzle-orm", "honojs/hono", "nestjs/nest",
  "remix-run/remix", "expressjs/express", "upstash/context7",
  "anthropics/anthropic-sdk-typescript", "openai/openai-node",
  "langchain-ai/langchainjs", "colinhacks/zod", "TanStack/query",
  "pmndrs/zustand", "vitest-dev/vitest", "microsoft/playwright",
  "t3-oss/create-t3-app",
];

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY required — results would not persist.");
    process.exit(1);
  }
  const base = process.argv[2] ?? "http://localhost:3000";

  for (const repo of REPOS) {
    const [owner, name] = repo.split("/");
    const started = Date.now();
    try {
      const res = await fetch(
        `${base}/api/analyses/stream?owner=${owner}&repo=${name}`,
        { signal: AbortSignal.timeout(180_000) },
      );
      const text = await res.text();
      const files = (text.match(/^event: file$/gm) ?? []).length;
      const failed = text.includes("event: error");
      console.log(
        `${failed ? "✗" : "✓"} ${repo} — ${files} files, ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    } catch (error) {
      console.log(`✗ ${repo} — ${error instanceof Error ? error.message : "failed"}`);
    }
  }
}

void main();
