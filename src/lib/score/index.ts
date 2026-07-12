import type { FactSheet } from "@/lib/generate/factsheet";

/** Readiness Score — deterministic, transparent (02 §9). 100 pts total. */

export interface ScoreItem {
  key: string;
  label: string;
  pass: boolean;
  points: number; // awarded
  maxPoints: number;
  fixHint: string;
}

export interface ScoreResult {
  total: number;
  band: "success" | "warning" | "destructive";
  items: ScoreItem[];
}

const OFFICIAL_SKILL_SLUGS = new Set(["shadcn", "supabase", "anthropic"]);

export function computeScore(
  facts: FactSheet,
  treePaths: string[],
): ScoreResult {
  const paths = new Set(treePaths);
  const has = (p: string) => paths.has(p);
  const hasPrefix = (prefix: string) =>
    treePaths.some((p) => p.startsWith(prefix));

  const rootScripts = facts.scriptsMap[""] ?? {};
  const scriptNames = new Set(Object.keys(rootScripts));
  const techSlugs = new Set(facts.techList.map((t) => t.slug));

  const agentFilePresent = has("AGENTS.md") || has("CLAUDE.md");
  const agentFileFresh =
    agentFilePresent && facts.existingConfigAudit.length === 0;

  const lockfilePresent = [
    "pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb",
    "poetry.lock", "uv.lock", "Cargo.lock", "go.sum", "composer.lock",
    "Gemfile.lock",
  ].some(has);

  const testFramework = ["vitest", "jest", "playwright", "cypress", "pytest"]
    .some((slug) => techSlugs.has(slug));
  const testFiles = treePaths.some((p) =>
    /\.(test|spec)\.[jt]sx?$|_test\.(go|py|rb)$|test_.*\.py$/.test(p),
  );

  const readmeLines = facts.readmeExcerpt
    ? facts.readmeExcerpt.split("\n").length
    : 0;

  const typed =
    techSlugs.has("typescript") ||
    techSlugs.has("go") ||
    techSlugs.has("rust") ||
    techSlugs.has("java") ||
    scriptNames.has("typecheck");

  const enginesDeclared =
    facts.techList.some((t) => t.slug === "bun" || t.slug === "deno") ||
    hasPrefix(".nvmrc") ||
    has(".python-version") ||
    has("go.mod") ||
    // package.json engines field surfaced via scriptsMap? not tracked — approximate with packageManager
    facts.packageManager !== undefined;

  const officialCoverage =
    facts.techList.length === 0
      ? 0
      : facts.techList.filter((t) => OFFICIAL_SKILL_SLUGS.has(t.slug)).length /
        facts.techList.length;

  const isMonorepo = facts.workspaceTopology.length > 0;

  const items: ScoreItem[] = [
    {
      key: "agent-file",
      label: "AGENTS.md or CLAUDE.md present",
      pass: agentFilePresent,
      points: agentFilePresent ? 10 : 0,
      maxPoints: 10,
      fixHint: "Add an AGENTS.md — gitbrief just generated one for you.",
    },
    {
      key: "agent-file-fresh",
      label: "Agent file has no stale claims",
      pass: agentFileFresh,
      points: agentFileFresh ? 5 : 0,
      maxPoints: 5,
      fixHint: "Update commands/paths in your agent file to match the repo.",
    },
    {
      key: "scripts",
      label: "dev, build and test scripts defined",
      pass: ["dev", "build", "test"].every((s) => scriptNames.has(s)),
      points: ["dev", "build", "test"].every((s) => scriptNames.has(s)) ? 15 : 0,
      maxPoints: 15,
      fixHint: "Define dev/build/test scripts in package.json (or equivalents).",
    },
    {
      key: "lockfile",
      label: "Lockfile present",
      pass: lockfilePresent,
      points: lockfilePresent ? 10 : 0,
      maxPoints: 10,
      fixHint: "Commit your lockfile so agents install exact versions.",
    },
    {
      key: "tests",
      label: "Test framework + test files",
      pass: testFramework && testFiles,
      points: testFramework && testFiles ? 10 : 0,
      maxPoints: 10,
      fixHint: "Add a test framework and at least one test file.",
    },
    {
      key: "ci",
      label: "CI workflow",
      pass: hasPrefix(".github/workflows/"),
      points: hasPrefix(".github/workflows/") ? 10 : 0,
      maxPoints: 10,
      fixHint: "Add a GitHub Actions workflow (lint + test on PR).",
    },
    {
      key: "readme",
      label: "README ≥ 30 lines",
      pass: readmeLines >= 30,
      points: readmeLines >= 30 ? 5 : 0,
      maxPoints: 5,
      fixHint: "Expand the README with setup and usage sections.",
    },
    {
      key: "ai-ignore",
      label: "Ignore file for AI tools",
      pass: has(".cursorignore") || has(".aiexclude") || has(".codeiumignore"),
      points:
        has(".cursorignore") || has(".aiexclude") || has(".codeiumignore")
          ? 5
          : 0,
      maxPoints: 5,
      fixHint: "Add a .cursorignore so agents skip build artifacts.",
    },
    {
      key: "typed",
      label: "Typed language or typecheck script",
      pass: typed,
      points: typed ? 5 : 0,
      maxPoints: 5,
      fixHint: "Add TypeScript or a typecheck script.",
    },
    {
      key: "engines",
      label: "Runtime/engines declared",
      pass: enginesDeclared,
      points: enginesDeclared ? 5 : 0,
      maxPoints: 5,
      fixHint: "Declare engines or a packageManager field.",
    },
    {
      key: "official-skills",
      label: "Official skills cover ≥50% of stack",
      pass: officialCoverage >= 0.5,
      points: officialCoverage >= 0.5 ? 10 : 0,
      maxPoints: 10,
      fixHint: "More of your stack gets official skills as vendors ship them.",
    },
    {
      key: "monorepo-topology",
      label: isMonorepo ? "Monorepo topology declared" : "Monorepo topology (n/a)",
      pass: isMonorepo ? facts.workspaceTopology.length > 0 : true,
      points: 5, // non-monorepos aren't penalized
      maxPoints: 5,
      fixHint: "Declare workspaces in package.json or pnpm-workspace.yaml.",
    },
    {
      key: "license",
      label: "LICENSE file",
      pass: has("LICENSE") || has("LICENSE.md") || has("LICENSE.txt"),
      points: has("LICENSE") || has("LICENSE.md") || has("LICENSE.txt") ? 5 : 0,
      maxPoints: 5,
      fixHint: "Add a LICENSE file.",
    },
  ];

  const total = items.reduce((sum, item) => sum + item.points, 0);
  const band = total >= 80 ? "success" : total >= 50 ? "warning" : "destructive";
  return { total, band, items };
}
