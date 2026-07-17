import { z } from "zod";
import type { DetectionResult } from "@/lib/detect/types";
import type { RepoEvent } from "@/lib/analyze/events";
import type { SampledFile } from "@/lib/generate/sample";

/**
 * FactSheet — the deterministic ground truth handed to generation (02 §7.2).
 * Includes secret-scrubbed source samples (prompt-only, never persisted —
 * 02 §11) so the generator can describe what the code actually does.
 */

export interface FactSheet {
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    stars: number;
    primaryLanguage: string | null;
  };
  techList: {
    slug: string;
    name: string;
    category: string;
    version?: string;
    versionConfidence?: "exact" | "range";
    variant?: string;
    packagePaths: string[];
  }[];
  /** packagePath ('' = root) → script name → command. */
  scriptsMap: Record<string, Record<string, string>>;
  /** Makefile / justfile targets, when present. */
  taskTargets: { file: string; targets: string[] }[];
  /** Pruned tree, depth ≤3, directories collapsed. */
  structureTree: string[];
  workspaceTopology: { path: string; name?: string }[];
  packageManager?: string;
  readmeExcerpt: string;
  /** Secret-scrubbed source samples by role — prompt-only, never persisted. */
  sampledFiles: SampledFile[];
  existingConfigAudit: ExistingConfigAudit[];
  languages: Record<string, number>;
  largeRepo: boolean;
}

export interface ExistingConfigAudit {
  file: string;
  staleClaims: string[];
}

const packageJsonSchema = z.object({
  name: z.string().optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  engines: z.record(z.string(), z.string()).optional(),
});

const CLAIM_COMMAND_RE =
  /`((?:npm|pnpm|yarn|bun|make|just|cargo|go|pytest|uv|poetry|composer|rails|mix) [^`]{1,80})`/g;

function parsePackageJson(content: string | undefined) {
  if (!content) return null;
  try {
    return packageJsonSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

/** Depth-3 pruned structure tree — dirs first, alphabetical, ≤80 entries. */
export function buildStructureTree(treePaths: string[]): string[] {
  const dirs = new Set<string>();
  const rootFiles: string[] = [];
  for (const path of treePaths) {
    const segments = path.split("/");
    if (segments.length === 1) {
      rootFiles.push(path);
    } else {
      for (let depth = 1; depth <= Math.min(3, segments.length - 1); depth++) {
        dirs.add(segments.slice(0, depth).join("/") + "/");
      }
    }
  }
  const noise = /^(node_modules|\.git|dist|build|\.next|vendor|__pycache__|target)\//;
  return [
    ...[...dirs].filter((d) => !noise.test(d)).sort(),
    ...rootFiles.sort(),
  ].slice(0, 80);
}

function extractTaskTargets(files: Map<string, string>) {
  const out: { file: string; targets: string[] }[] = [];
  const makefile = files.get("Makefile");
  if (makefile) {
    const targets = [
      ...makefile.matchAll(/^([A-Za-z][\w-]*):(?!=)/gm),
    ].map((m) => m[1] ?? "");
    if (targets.length) out.push({ file: "Makefile", targets: targets.slice(0, 20) });
  }
  const justfile = files.get("justfile");
  if (justfile) {
    const targets = [
      ...justfile.matchAll(/^([A-Za-z][\w-]*)\s*[^=\n]*:$/gm),
    ].map((m) => m[1] ?? "");
    if (targets.length) out.push({ file: "justfile", targets: targets.slice(0, 20) });
  }
  return out;
}

/** 02 §4 — audit existing agent files for stale command/path claims. */
export function auditExistingConfigs(
  files: Map<string, string>,
  scriptsMap: Record<string, Record<string, string>>,
  taskTargets: { file: string; targets: string[] }[],
  treePaths: string[],
): ExistingConfigAudit[] {
  const agentFiles = ["CLAUDE.md", "AGENTS.md", ".cursorrules", ".windsurfrules"];
  const allScripts = new Set<string>();
  for (const scripts of Object.values(scriptsMap)) {
    for (const name of Object.keys(scripts)) allScripts.add(name);
  }
  const allTargets = new Set(taskTargets.flatMap((t) => t.targets));
  const pathSet = new Set(treePaths);

  const audits: ExistingConfigAudit[] = [];
  for (const file of agentFiles) {
    const content = files.get(file);
    if (!content) continue;
    const staleClaims: string[] = [];
    for (const match of content.matchAll(CLAIM_COMMAND_RE)) {
      const command = match[1] ?? "";
      const words = command.split(/\s+/);
      const runner = words[0] ?? "";
      if (["npm", "pnpm", "yarn", "bun"].includes(runner)) {
        // `pnpm run x` / `pnpm x` / `npm run x`
        const scriptName = words[1] === "run" ? words[2] : words[1];
        const wellKnown = [
          "install", "i", "add", "remove", "dev", "build", "start", "test",
          "dlx", "exec", "create", "init", "ci", "publish",
        ];
        if (
          scriptName &&
          !allScripts.has(scriptName) &&
          !wellKnown.includes(scriptName)
        ) {
          staleClaims.push(command);
        }
      } else if (["make", "just"].includes(runner)) {
        const target = words[1];
        if (target && !allTargets.has(target)) staleClaims.push(command);
      }
    }
    // path-like claims
    for (const match of content.matchAll(/`([\w.@-]+\/[\w./@-]+)`/g)) {
      const claimed = match[1] ?? "";
      if (
        claimed.includes("/") &&
        !claimed.startsWith("http") &&
        !pathSet.has(claimed) &&
        !treePaths.some((p) => p.startsWith(claimed.replace(/\/$/, "") + "/"))
      ) {
        staleClaims.push(claimed);
      }
    }
    if (staleClaims.length > 0) {
      audits.push({ file, staleClaims: [...new Set(staleClaims)].slice(0, 10) });
    }
  }
  return audits;
}

export function buildFactSheet(
  repo: RepoEvent,
  detection: DetectionResult,
  treePaths: string[],
  files: Map<string, string>,
  sampledFiles: SampledFile[] = [],
): FactSheet {
  const scriptsMap: Record<string, Record<string, string>> = {};
  const packagePaths = [
    "",
    ...detection.workspaces.map((workspace) => workspace.path),
  ];
  for (const packagePath of packagePaths) {
    const file = packagePath ? `${packagePath}/package.json` : "package.json";
    const pkg = parsePackageJson(files.get(file));
    if (pkg?.scripts && Object.keys(pkg.scripts).length > 0) {
      scriptsMap[packagePath] = pkg.scripts;
    }
  }

  const taskTargets = extractTaskTargets(files);
  const workspaceTopology = detection.workspaces.map((workspace) => {
    const pkg = parsePackageJson(files.get(`${workspace.path}/package.json`));
    return pkg?.name
      ? { path: workspace.path, name: pkg.name }
      : { path: workspace.path };
  });

  const readme = files.get("README.md") ?? "";
  // ≤3500 tokens ≈ 14000 chars — the README is the author's own description
  // of the project; starving it starves the brief.
  const readmeExcerpt = readme.slice(0, 14000);

  return {
    repo: {
      owner: repo.owner,
      name: repo.repo,
      defaultBranch: repo.defaultBranch,
      stars: repo.stars,
      primaryLanguage: repo.language,
    },
    techList: detection.techs.map((tech) => ({
      slug: tech.slug,
      name: tech.name,
      category: tech.category,
      packagePaths: tech.packagePaths,
      ...(tech.version ? { version: tech.version } : {}),
      ...(tech.versionConfidence
        ? { versionConfidence: tech.versionConfidence }
        : {}),
      ...(tech.variant ? { variant: tech.variant } : {}),
    })),
    scriptsMap,
    taskTargets,
    structureTree: buildStructureTree(treePaths),
    workspaceTopology,
    ...(detection.packageManager
      ? { packageManager: detection.packageManager }
      : {}),
    readmeExcerpt,
    sampledFiles,
    existingConfigAudit: auditExistingConfigs(
      files,
      scriptsMap,
      taskTargets,
      treePaths,
    ),
    languages: detection.languages,
    largeRepo: detection.largeRepo,
  };
}
