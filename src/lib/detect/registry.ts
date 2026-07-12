/**
 * Canonical technology + detection-rule registry — 03 §4.
 * Single source of truth: the fast-path engine imports it directly and
 * `pnpm db:seed` upserts it into Supabase (technologies + detection_rules).
 */

export type TechCategory =
  | "framework"
  | "language"
  | "styling"
  | "database"
  | "auth"
  | "testing"
  | "infra"
  | "tooling"
  | "ai"
  | "uncategorized";

export type Ecosystem =
  | "npm"
  | "pypi"
  | "cargo"
  | "go"
  | "composer"
  | "gem"
  | "maven";

export interface DependencyRule {
  type: "dependency";
  ecosystem: Ecosystem;
  /** Dep name; trailing `*` = prefix match (e.g. `@remix-run/*`). */
  pattern: string;
}

export interface FileRule {
  type: "file";
  /** Path glob over the git tree (minimatch-lite: `*` within segment, `**` any). */
  pattern: string;
}

export interface ConfigPatternRule {
  type: "config-pattern";
  /** Regex applied to fetched file content. */
  pattern: string;
  targetFileGlob: string;
  versionHint?: string;
}

export type DetectionRule = DependencyRule | FileRule | ConfigPatternRule;

export interface Technology {
  slug: string;
  name: string;
  category: TechCategory;
  iconRef?: string; // simple-icons slug
  homepage?: string;
  llmsTxtUrl?: string;
  mcpServerJson?: Record<string, unknown>;
  rules: DetectionRule[];
  /** Package whose lockfile entry provides the exact version (defaults to first npm dependency rule pattern). */
  versionPackage?: string;
}

const npm = (pattern: string): DependencyRule => ({
  type: "dependency",
  ecosystem: "npm",
  pattern,
});
const pypi = (pattern: string): DependencyRule => ({
  type: "dependency",
  ecosystem: "pypi",
  pattern,
});
const file = (pattern: string): FileRule => ({ type: "file", pattern });

export const TECHNOLOGIES: Technology[] = [
  // ── Frameworks ──────────────────────────────────────────────
  {
    slug: "nextjs",
    name: "Next.js",
    category: "framework",
    iconRef: "nextdotjs",
    homepage: "https://nextjs.org",
    rules: [npm("next"), file("next.config.*")],
  },
  {
    slug: "react",
    name: "React",
    category: "framework",
    iconRef: "react",
    homepage: "https://react.dev",
    rules: [npm("react")],
  },
  {
    slug: "vue",
    name: "Vue",
    category: "framework",
    iconRef: "vuedotjs",
    homepage: "https://vuejs.org",
    rules: [npm("vue")],
  },
  {
    slug: "nuxt",
    name: "Nuxt",
    category: "framework",
    iconRef: "nuxt",
    homepage: "https://nuxt.com",
    rules: [npm("nuxt"), file("nuxt.config.*")],
  },
  {
    slug: "svelte",
    name: "Svelte",
    category: "framework",
    iconRef: "svelte",
    homepage: "https://svelte.dev",
    rules: [npm("svelte"), npm("@sveltejs/kit"), file("svelte.config.*")],
  },
  {
    slug: "astro",
    name: "Astro",
    category: "framework",
    iconRef: "astro",
    homepage: "https://astro.build",
    rules: [npm("astro"), file("astro.config.*")],
  },
  {
    slug: "remix",
    name: "Remix",
    category: "framework",
    iconRef: "remix",
    homepage: "https://remix.run",
    rules: [npm("@remix-run/*")],
    versionPackage: "@remix-run/react",
  },
  {
    slug: "express",
    name: "Express",
    category: "framework",
    iconRef: "express",
    homepage: "https://expressjs.com",
    rules: [npm("express")],
  },
  {
    slug: "fastify",
    name: "Fastify",
    category: "framework",
    iconRef: "fastify",
    homepage: "https://fastify.dev",
    rules: [npm("fastify")],
  },
  {
    slug: "hono",
    name: "Hono",
    category: "framework",
    iconRef: "hono",
    homepage: "https://hono.dev",
    rules: [npm("hono")],
  },
  {
    slug: "nestjs",
    name: "NestJS",
    category: "framework",
    iconRef: "nestjs",
    homepage: "https://nestjs.com",
    rules: [npm("@nestjs/core")],
  },
  {
    slug: "django",
    name: "Django",
    category: "framework",
    iconRef: "django",
    homepage: "https://www.djangoproject.com",
    rules: [pypi("django"), file("manage.py")],
  },
  {
    slug: "fastapi",
    name: "FastAPI",
    category: "framework",
    iconRef: "fastapi",
    homepage: "https://fastapi.tiangolo.com",
    rules: [pypi("fastapi")],
  },
  {
    slug: "flask",
    name: "Flask",
    category: "framework",
    iconRef: "flask",
    homepage: "https://flask.palletsprojects.com",
    rules: [pypi("flask")],
  },
  {
    slug: "rails",
    name: "Ruby on Rails",
    category: "framework",
    iconRef: "rubyonrails",
    homepage: "https://rubyonrails.org",
    rules: [{ type: "dependency", ecosystem: "gem", pattern: "rails" }],
  },
  {
    slug: "laravel",
    name: "Laravel",
    category: "framework",
    iconRef: "laravel",
    homepage: "https://laravel.com",
    rules: [
      { type: "dependency", ecosystem: "composer", pattern: "laravel/framework" },
    ],
  },
  {
    slug: "gin",
    name: "Gin",
    category: "framework",
    iconRef: "gin",
    homepage: "https://gin-gonic.com",
    rules: [
      { type: "dependency", ecosystem: "go", pattern: "github.com/gin-gonic/gin" },
    ],
  },
  {
    slug: "spring",
    name: "Spring",
    category: "framework",
    iconRef: "spring",
    homepage: "https://spring.io",
    rules: [
      { type: "dependency", ecosystem: "maven", pattern: "org.springframework*" },
    ],
  },

  // ── Languages / runtimes ────────────────────────────────────
  {
    slug: "typescript",
    name: "TypeScript",
    category: "language",
    iconRef: "typescript",
    homepage: "https://www.typescriptlang.org",
    rules: [npm("typescript"), file("tsconfig.json")],
  },
  {
    slug: "python",
    name: "Python",
    category: "language",
    iconRef: "python",
    homepage: "https://python.org",
    rules: [file("pyproject.toml"), file("requirements.txt"), file("setup.py")],
  },
  {
    slug: "go",
    name: "Go",
    category: "language",
    iconRef: "go",
    homepage: "https://go.dev",
    rules: [file("go.mod")],
  },
  {
    slug: "rust",
    name: "Rust",
    category: "language",
    iconRef: "rust",
    homepage: "https://rust-lang.org",
    rules: [file("Cargo.toml")],
  },
  {
    slug: "php",
    name: "PHP",
    category: "language",
    iconRef: "php",
    homepage: "https://php.net",
    rules: [file("composer.json")],
  },
  {
    slug: "ruby",
    name: "Ruby",
    category: "language",
    iconRef: "ruby",
    homepage: "https://ruby-lang.org",
    rules: [file("Gemfile")],
  },
  {
    slug: "java",
    name: "Java",
    category: "language",
    iconRef: "openjdk",
    homepage: "https://openjdk.org",
    rules: [file("pom.xml"), file("build.gradle*")],
  },
  {
    slug: "bun",
    name: "Bun",
    category: "language",
    iconRef: "bun",
    homepage: "https://bun.sh",
    rules: [file("bun.lockb"), file("bun.lock")],
  },
  {
    slug: "deno",
    name: "Deno",
    category: "language",
    iconRef: "deno",
    homepage: "https://deno.com",
    rules: [file("deno.json"), file("deno.jsonc")],
  },

  // ── Styling / UI ────────────────────────────────────────────
  {
    slug: "tailwind",
    name: "Tailwind CSS",
    category: "styling",
    iconRef: "tailwindcss",
    homepage: "https://tailwindcss.com",
    llmsTxtUrl: "https://tailwindcss.com/llms.txt",
    rules: [
      npm("tailwindcss"),
      file("tailwind.config.*"),
      {
        type: "config-pattern",
        pattern: "@tailwindcss/postcss",
        targetFileGlob: "postcss.config.*",
        versionHint: "major>=4",
      },
    ],
  },
  {
    slug: "shadcn",
    name: "shadcn/ui",
    category: "styling",
    iconRef: "shadcnui",
    homepage: "https://ui.shadcn.com",
    rules: [file("components.json")],
  },
  {
    slug: "radix",
    name: "Radix UI",
    category: "styling",
    iconRef: "radixui",
    homepage: "https://www.radix-ui.com",
    rules: [npm("@radix-ui/*")],
    versionPackage: "@radix-ui/react-dialog",
  },
  {
    slug: "mui",
    name: "MUI",
    category: "styling",
    iconRef: "mui",
    homepage: "https://mui.com",
    rules: [npm("@mui/material")],
  },
  {
    slug: "chakra",
    name: "Chakra UI",
    category: "styling",
    iconRef: "chakraui",
    homepage: "https://chakra-ui.com",
    rules: [npm("@chakra-ui/react")],
  },
  {
    slug: "styled-components",
    name: "styled-components",
    category: "styling",
    iconRef: "styledcomponents",
    homepage: "https://styled-components.com",
    rules: [npm("styled-components")],
  },
  {
    slug: "sass",
    name: "Sass",
    category: "styling",
    iconRef: "sass",
    homepage: "https://sass-lang.com",
    rules: [npm("sass")],
  },
  {
    slug: "framer-motion",
    name: "Framer Motion",
    category: "styling",
    iconRef: "framer",
    homepage: "https://motion.dev",
    rules: [npm("framer-motion"), npm("motion")],
  },

  // ── Database / ORM ──────────────────────────────────────────
  {
    slug: "supabase",
    name: "Supabase",
    category: "database",
    iconRef: "supabase",
    homepage: "https://supabase.com",
    mcpServerJson: {
      command: "npx",
      args: ["-y", "@supabase/mcp-server-supabase"],
    },
    rules: [npm("@supabase/supabase-js"), file("supabase/**")],
  },
  {
    slug: "prisma",
    name: "Prisma",
    category: "database",
    iconRef: "prisma",
    homepage: "https://prisma.io",
    rules: [npm("prisma"), npm("@prisma/client"), file("prisma/schema.prisma")],
    versionPackage: "@prisma/client",
  },
  {
    slug: "drizzle",
    name: "Drizzle ORM",
    category: "database",
    iconRef: "drizzle",
    homepage: "https://orm.drizzle.team",
    rules: [npm("drizzle-orm"), file("drizzle.config.*")],
  },
  {
    slug: "mongoose",
    name: "Mongoose",
    category: "database",
    iconRef: "mongoose",
    homepage: "https://mongoosejs.com",
    rules: [npm("mongoose")],
  },
  {
    slug: "sqlalchemy",
    name: "SQLAlchemy",
    category: "database",
    iconRef: "sqlalchemy",
    homepage: "https://sqlalchemy.org",
    rules: [pypi("sqlalchemy")],
  },
  {
    slug: "postgres",
    name: "PostgreSQL",
    category: "database",
    iconRef: "postgresql",
    homepage: "https://postgresql.org",
    rules: [npm("pg"), pypi("psycopg2"), pypi("psycopg")],
  },
  {
    slug: "mysql",
    name: "MySQL",
    category: "database",
    iconRef: "mysql",
    homepage: "https://mysql.com",
    rules: [npm("mysql2")],
  },
  {
    slug: "sqlite",
    name: "SQLite",
    category: "database",
    iconRef: "sqlite",
    homepage: "https://sqlite.org",
    rules: [npm("better-sqlite3")],
  },
  {
    slug: "redis",
    name: "Redis",
    category: "database",
    iconRef: "redis",
    homepage: "https://redis.io",
    rules: [npm("redis"), npm("ioredis")],
  },
  {
    slug: "upstash",
    name: "Upstash",
    category: "database",
    iconRef: "upstash",
    homepage: "https://upstash.com",
    rules: [npm("@upstash/redis")],
  },

  // ── Auth ────────────────────────────────────────────────────
  {
    slug: "nextauth",
    name: "Auth.js",
    category: "auth",
    iconRef: "auth0",
    homepage: "https://authjs.dev",
    rules: [npm("next-auth"), npm("@auth/*")],
    versionPackage: "next-auth",
  },
  {
    slug: "clerk",
    name: "Clerk",
    category: "auth",
    iconRef: "clerk",
    homepage: "https://clerk.com",
    rules: [npm("@clerk/*")],
    versionPackage: "@clerk/nextjs",
  },
  {
    slug: "better-auth",
    name: "Better Auth",
    category: "auth",
    homepage: "https://better-auth.com",
    rules: [npm("better-auth")],
  },
  {
    slug: "lucia",
    name: "Lucia",
    category: "auth",
    homepage: "https://lucia-auth.com",
    rules: [npm("lucia")],
  },

  // ── Testing ─────────────────────────────────────────────────
  {
    slug: "vitest",
    name: "Vitest",
    category: "testing",
    iconRef: "vitest",
    homepage: "https://vitest.dev",
    rules: [npm("vitest")],
  },
  {
    slug: "jest",
    name: "Jest",
    category: "testing",
    iconRef: "jest",
    homepage: "https://jestjs.io",
    rules: [npm("jest")],
  },
  {
    slug: "playwright",
    name: "Playwright",
    category: "testing",
    iconRef: "playwright",
    homepage: "https://playwright.dev",
    rules: [npm("@playwright/test"), npm("playwright")],
    versionPackage: "@playwright/test",
  },
  {
    slug: "cypress",
    name: "Cypress",
    category: "testing",
    iconRef: "cypress",
    homepage: "https://cypress.io",
    rules: [npm("cypress")],
  },
  {
    slug: "pytest",
    name: "pytest",
    category: "testing",
    iconRef: "pytest",
    homepage: "https://pytest.org",
    rules: [pypi("pytest")],
  },
  {
    slug: "testing-library",
    name: "Testing Library",
    category: "testing",
    iconRef: "testinglibrary",
    homepage: "https://testing-library.com",
    rules: [npm("@testing-library/*")],
    versionPackage: "@testing-library/react",
  },

  // ── Infra / tooling ─────────────────────────────────────────
  {
    slug: "docker",
    name: "Docker",
    category: "infra",
    iconRef: "docker",
    homepage: "https://docker.com",
    rules: [file("Dockerfile"), file("docker-compose*")],
  },
  {
    slug: "vercel",
    name: "Vercel",
    category: "infra",
    iconRef: "vercel",
    homepage: "https://vercel.com",
    rules: [file("vercel.json")],
  },
  {
    slug: "turborepo",
    name: "Turborepo",
    category: "tooling",
    iconRef: "turborepo",
    homepage: "https://turborepo.dev",
    rules: [npm("turbo"), file("turbo.json")],
  },
  {
    slug: "nx",
    name: "Nx",
    category: "tooling",
    iconRef: "nx",
    homepage: "https://nx.dev",
    rules: [npm("nx"), file("nx.json")],
  },
  {
    slug: "pnpm",
    name: "pnpm",
    category: "tooling",
    iconRef: "pnpm",
    homepage: "https://pnpm.io",
    rules: [file("pnpm-lock.yaml")],
  },
  {
    slug: "yarn",
    name: "Yarn",
    category: "tooling",
    iconRef: "yarn",
    homepage: "https://yarnpkg.com",
    rules: [file("yarn.lock")],
  },
  {
    slug: "npm",
    name: "npm",
    category: "tooling",
    iconRef: "npm",
    homepage: "https://npmjs.com",
    rules: [file("package-lock.json")],
  },
  {
    slug: "eslint",
    name: "ESLint",
    category: "tooling",
    iconRef: "eslint",
    homepage: "https://eslint.org",
    rules: [npm("eslint")],
  },
  {
    slug: "prettier",
    name: "Prettier",
    category: "tooling",
    iconRef: "prettier",
    homepage: "https://prettier.io",
    rules: [npm("prettier")],
  },
  {
    slug: "biome",
    name: "Biome",
    category: "tooling",
    iconRef: "biome",
    homepage: "https://biomejs.dev",
    rules: [npm("@biomejs/biome")],
  },
  {
    slug: "storybook",
    name: "Storybook",
    category: "tooling",
    iconRef: "storybook",
    homepage: "https://storybook.js.org",
    rules: [npm("storybook"), file(".storybook/**")],
  },
  {
    slug: "trpc",
    name: "tRPC",
    category: "tooling",
    iconRef: "trpc",
    homepage: "https://trpc.io",
    rules: [npm("@trpc/*")],
    versionPackage: "@trpc/server",
  },
  {
    slug: "zod",
    name: "Zod",
    category: "tooling",
    iconRef: "zod",
    homepage: "https://zod.dev",
    rules: [npm("zod")],
  },
  {
    slug: "stripe",
    name: "Stripe",
    category: "tooling",
    iconRef: "stripe",
    homepage: "https://stripe.com",
    mcpServerJson: {
      command: "npx",
      args: ["-y", "@stripe/mcp", "--tools=all"],
    },
    rules: [npm("stripe"), pypi("stripe")],
  },
  {
    slug: "sentry",
    name: "Sentry",
    category: "tooling",
    iconRef: "sentry",
    homepage: "https://sentry.io",
    mcpServerJson: {
      command: "npx",
      args: ["-y", "@sentry/mcp-server"],
    },
    rules: [npm("@sentry/*"), pypi("sentry-sdk")],
    versionPackage: "@sentry/nextjs",
  },
  {
    slug: "inngest",
    name: "Inngest",
    category: "tooling",
    iconRef: "inngest",
    homepage: "https://inngest.com",
    rules: [npm("inngest")],
  },

  // ── AI ──────────────────────────────────────────────────────
  {
    slug: "anthropic",
    name: "Anthropic SDK",
    category: "ai",
    iconRef: "anthropic",
    homepage: "https://docs.anthropic.com",
    llmsTxtUrl: "https://docs.anthropic.com/llms.txt",
    rules: [npm("@anthropic-ai/sdk"), pypi("anthropic")],
  },
  {
    slug: "openai",
    name: "OpenAI SDK",
    category: "ai",
    iconRef: "openai",
    homepage: "https://platform.openai.com",
    rules: [npm("openai"), pypi("openai")],
  },
  {
    slug: "vercel-ai",
    name: "Vercel AI SDK",
    category: "ai",
    iconRef: "vercel",
    homepage: "https://sdk.vercel.ai",
    llmsTxtUrl: "https://sdk.vercel.ai/llms.txt",
    rules: [npm("ai")],
  },
  {
    slug: "langchain",
    name: "LangChain",
    category: "ai",
    iconRef: "langchain",
    homepage: "https://langchain.com",
    rules: [npm("langchain"), npm("@langchain/*"), pypi("langchain")],
    versionPackage: "langchain",
  },
];

export const TECH_BY_SLUG = new Map(TECHNOLOGIES.map((t) => [t.slug, t]));
