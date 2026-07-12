import { matchesGlob } from "@/lib/detect/glob";

/**
 * Candidate-file selection from the git tree — 02 §2.3.
 * Priority-ordered, fetch AT MOST `cap` blobs.
 */

const ROOT_MANIFESTS = [
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb", // never parsed (binary) — flags bun only
  "requirements.txt",
  "pyproject.toml",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "go.mod",
  "go.sum",
  "Cargo.toml",
  "Cargo.lock",
  "composer.json",
  "composer.lock",
  "Gemfile",
  "Gemfile.lock",
  "pom.xml",
  "pubspec.yaml",
  "mix.exs",
];

const WORKSPACE_CONFIGS = [
  "pnpm-workspace.yaml",
  "turbo.json",
  "nx.json",
  "lerna.json",
];

const CONFIG_SIGNALS = [
  "next.config.*",
  "nuxt.config.*",
  "vite.config.*",
  "astro.config.*",
  "svelte.config.*",
  "remix.config.*",
  "tailwind.config.*",
  "postcss.config.*",
  "components.json",
  "tsconfig.json",
  "drizzle.config.*",
  "prisma/schema.prisma",
  "supabase/config.toml",
  "firebase.json",
  "Dockerfile",
  "docker-compose*",
  "Makefile",
  "justfile",
  "Taskfile.yml",
];

const AGENT_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  ".cursorrules",
  ".windsurfrules",
  ".github/copilot-instructions.md",
];

/** Binary / parse-skipped files we select for presence only. */
export const PRESENCE_ONLY = new Set(["bun.lockb"]);

export function selectCandidateFiles(
  treePaths: string[],
  workspacePackagePaths: string[] = [],
  cap = 30,
): string[] {
  const pathSet = new Set(treePaths);
  const selected: string[] = [];
  const add = (path: string) => {
    if (selected.length < cap && pathSet.has(path) && !selected.includes(path)) {
      selected.push(path);
    }
  };

  for (const name of ROOT_MANIFESTS) add(name);
  for (const name of WORKSPACE_CONFIGS) add(name);

  // *.csproj — first 3 anywhere (02 §2.3)
  treePaths
    .filter((p) => p.endsWith(".csproj"))
    .slice(0, 3)
    .forEach(add);
  // build.gradle*
  treePaths
    .filter((p) => /^build\.gradle(\.kts)?$/.test(p))
    .forEach(add);

  for (const glob of CONFIG_SIGNALS) {
    if (glob.includes("*")) {
      const match = treePaths.find(
        (p) => !p.includes("/") && matchesGlob(p, glob),
      );
      if (match) add(match);
    } else {
      add(glob);
    }
  }

  // Workspace package.json files (monorepo per-package detection)
  for (const pkgPath of workspacePackagePaths) {
    add(pkgPath ? `${pkgPath}/package.json` : "package.json");
  }

  for (const name of AGENT_FILES) add(name);
  const cursorRule = treePaths.find((p) => p.startsWith(".cursor/rules/"));
  if (cursorRule) add(cursorRule);

  add("README.md");
  return selected;
}
