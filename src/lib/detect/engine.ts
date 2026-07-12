import { parse as parseYaml } from "yaml";
import { matchesGlob } from "@/lib/detect/glob";
import { LOCKFILES, type VersionMap } from "@/lib/detect/lockfiles";
import { TECHNOLOGIES, type Technology } from "@/lib/detect/registry";
import {
  type DetectedTech,
  type DetectionResult,
  type Evidence,
  type WorkspacePackage,
} from "@/lib/detect/types";

/**
 * Detection engine — 02 §3, layers 1–5. Pure function over the fetched
 * tree + file contents; no I/O, fully unit-testable.
 */

export interface EngineInput {
  treePaths: string[];
  /** path → content for fetched candidate files. */
  files: Map<string, string>;
  languages: Record<string, number>;
  largeRepo: boolean;
}

interface DepEntry {
  range: string;
  manifest: string; // file path evidence
  packagePath: string; // '' = root
}

type DepMaps = Map<string, Map<string, DepEntry>>; // ecosystem → dep name → entry

function excerpt(text: string): string {
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function parseJson(content: string): Record<string, unknown> | null {
  try {
    const doc: unknown = JSON.parse(content);
    return typeof doc === "object" && doc !== null
      ? (doc as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// ── Layer 5 first: workspaces (needed to key per-package deps) ──

export function findWorkspaces(input: EngineInput): WorkspacePackage[] {
  const globs: string[] = [];
  const rootPkg = input.files.get("package.json");
  if (rootPkg) {
    const doc = parseJson(rootPkg);
    const ws = doc?.workspaces;
    if (Array.isArray(ws)) globs.push(...ws.filter((g) => typeof g === "string"));
    else if (
      typeof ws === "object" &&
      ws !== null &&
      "packages" in ws &&
      Array.isArray(ws.packages)
    ) {
      globs.push(...ws.packages.filter((g: unknown) => typeof g === "string"));
    }
  }
  const pnpmWs = input.files.get("pnpm-workspace.yaml");
  if (pnpmWs) {
    try {
      const doc: unknown = parseYaml(pnpmWs);
      if (
        typeof doc === "object" &&
        doc !== null &&
        "packages" in doc &&
        Array.isArray(doc.packages)
      ) {
        globs.push(...doc.packages.filter((g: unknown) => typeof g === "string"));
      }
    } catch {
      // ignore malformed workspace file
    }
  }
  if (globs.length === 0) return [];

  const packages: WorkspacePackage[] = [];
  const pkgJsons = input.treePaths.filter(
    (p) => p.endsWith("/package.json") && !p.includes("node_modules"),
  );
  for (const pkgJson of pkgJsons) {
    const dir = pkgJson.slice(0, -"/package.json".length);
    const included = globs.some((g) => {
      if (g.startsWith("!")) return false;
      return matchesGlob(dir, g.replace(/\/\*?$/, "/*")) || matchesGlob(dir, g);
    });
    if (included) packages.push({ path: dir });
  }
  return packages;
}

// ── Layer 1: dependency maps per ecosystem ──────────────────────

export function buildDepMaps(
  input: EngineInput,
  workspaces: WorkspacePackage[],
): DepMaps {
  const maps: DepMaps = new Map();
  const put = (
    ecosystem: string,
    name: string,
    range: string,
    manifest: string,
    packagePath: string,
  ) => {
    let eco = maps.get(ecosystem);
    if (!eco) maps.set(ecosystem, (eco = new Map()));
    if (!eco.has(name)) eco.set(name, { range, manifest, packagePath });
  };

  // npm: root + workspace package.json
  const pkgPaths = [
    { file: "package.json", packagePath: "" },
    ...workspaces.map((w) => ({
      file: `${w.path}/package.json`,
      packagePath: w.path,
    })),
  ];
  for (const { file, packagePath } of pkgPaths) {
    const doc = parseJson(input.files.get(file) ?? "");
    if (!doc) continue;
    for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
      const deps = doc[key];
      if (typeof deps !== "object" || deps === null) continue;
      for (const [name, range] of Object.entries(deps)) {
        if (typeof range === "string") put("npm", name, range, file, packagePath);
      }
    }
  }

  // pypi: pyproject.toml + requirements.txt
  const pyproject = input.files.get("pyproject.toml");
  if (pyproject) {
    const depLines =
      pyproject.match(/^\s*"([A-Za-z0-9._-]+)[^"]*"/gm)?.map((l) => l.trim()) ??
      [];
    for (const line of depLines) {
      const name = /"([A-Za-z0-9._-]+)/.exec(line)?.[1];
      if (name) put("pypi", name.toLowerCase(), "*", "pyproject.toml", "");
    }
    // poetry style: [tool.poetry.dependencies] name = "^x"
    const poetryBlock =
      /\[tool\.poetry\.dependencies\]([\s\S]*?)(\n\[|$)/.exec(pyproject)?.[1];
    if (poetryBlock) {
      for (const match of poetryBlock.matchAll(
        /^([A-Za-z0-9._-]+)\s*=\s*"([^"]+)"/gm,
      )) {
        if (match[1] && match[2]) {
          put("pypi", match[1].toLowerCase(), match[2], "pyproject.toml", "");
        }
      }
    }
  }
  const requirements = input.files.get("requirements.txt");
  if (requirements) {
    for (const line of requirements.split("\n")) {
      const match = /^([A-Za-z0-9._-]+)\s*(?:[=<>!~[]|$)/.exec(line.trim());
      if (match?.[1]) {
        put("pypi", match[1].toLowerCase(), "*", "requirements.txt", "");
      }
    }
  }

  // go
  const goMod = input.files.get("go.mod");
  if (goMod) {
    for (const match of goMod.matchAll(/^\s*([\w./-]+)\s+v([\w.+-]+)/gm)) {
      if (match[1] && match[2] && match[1].includes("/")) {
        put("go", match[1], match[2], "go.mod", "");
      }
    }
  }

  // cargo
  const cargoToml = input.files.get("Cargo.toml");
  if (cargoToml) {
    const depsBlock =
      /\[dependencies\]([\s\S]*?)(\n\[|$)/.exec(cargoToml)?.[1] ?? "";
    for (const match of depsBlock.matchAll(/^([A-Za-z0-9_-]+)\s*=/gm)) {
      if (match[1]) put("cargo", match[1], "*", "Cargo.toml", "");
    }
  }

  // composer
  const composer = parseJson(input.files.get("composer.json") ?? "");
  if (composer) {
    for (const key of ["require", "require-dev"]) {
      const deps = composer[key];
      if (typeof deps !== "object" || deps === null) continue;
      for (const [name, range] of Object.entries(deps)) {
        if (typeof range === "string") {
          put("composer", name, range, "composer.json", "");
        }
      }
    }
  }

  // gem
  const gemfile = input.files.get("Gemfile");
  if (gemfile) {
    for (const match of gemfile.matchAll(/^\s*gem\s+["']([\w-]+)["']/gm)) {
      if (match[1]) put("gem", match[1], "*", "Gemfile", "");
    }
  }

  // maven: pattern prefix scan over pom.xml groupIds
  const pom = input.files.get("pom.xml");
  if (pom) {
    for (const match of pom.matchAll(/<groupId>([^<]+)<\/groupId>/g)) {
      if (match[1]) put("maven", match[1].trim(), "*", "pom.xml", "");
    }
  }

  return maps;
}

// ── Layer 3: lockfile version maps ──────────────────────────────

export function buildLockfileVersions(
  input: EngineInput,
): Map<string, { versions: VersionMap; file: string }> {
  const byEcosystem = new Map<string, { versions: VersionMap; file: string }>();
  for (const lock of LOCKFILES) {
    if (byEcosystem.has(lock.ecosystem)) continue;
    const content = input.files.get(lock.file);
    if (!content) continue;
    const versions = lock.parse(content);
    if (versions.size > 0) {
      byEcosystem.set(lock.ecosystem, { versions, file: lock.file });
    }
  }
  return byEcosystem;
}

// ── Rule matching ────────────────────────────────────────────────

function depLookup(
  maps: DepMaps,
  ecosystem: string,
  pattern: string,
): { name: string; entry: DepEntry }[] {
  const eco = maps.get(ecosystem);
  if (!eco) return [];
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return [...eco.entries()]
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, entry]) => ({ name, entry }));
  }
  const entry = eco.get(pattern);
  return entry ? [{ name: pattern, entry }] : [];
}

function detectTech(
  tech: Technology,
  input: EngineInput,
  depMaps: DepMaps,
  locks: Map<string, { versions: VersionMap; file: string }>,
): DetectedTech | null {
  const evidence: Evidence[] = [];
  const packagePaths = new Set<string>();
  let matchedDepName: string | undefined;
  let range: string | undefined;

  for (const rule of tech.rules) {
    if (rule.type === "dependency") {
      const hits = depLookup(depMaps, rule.ecosystem, rule.pattern);
      for (const { name, entry } of hits) {
        if (!matchedDepName) {
          matchedDepName = name;
          range = entry.range;
        }
        packagePaths.add(entry.packagePath);
        if (evidence.length < 4) {
          evidence.push({
            file: entry.manifest,
            kind: "dependency",
            excerpt: excerpt(`"${name}": "${entry.range}"`),
          });
        }
      }
    } else if (rule.type === "file") {
      const hit = input.treePaths.find((p) => matchesGlob(p, rule.pattern));
      if (hit && evidence.length < 4) {
        evidence.push({ file: hit, kind: "file", excerpt: hit });
      }
    } else {
      // config-pattern
      for (const [path, content] of input.files) {
        if (!matchesGlob(path, rule.targetFileGlob)) continue;
        const match = new RegExp(rule.pattern).exec(content);
        if (match && evidence.length < 4) {
          evidence.push({
            file: path,
            kind: "config-pattern",
            excerpt: excerpt(match[0]),
          });
        }
      }
    }
  }

  if (evidence.length === 0) return null;

  // Version — lockfile exact first (02 §3 L3)
  const versionPkg = tech.versionPackage ?? matchedDepName;
  let version: string | undefined;
  let versionConfidence: "exact" | "range" | undefined;
  if (versionPkg) {
    for (const [, { versions, file }] of locks) {
      const exact =
        versions.get(versionPkg) ?? versions.get(versionPkg.toLowerCase());
      if (exact) {
        version = exact;
        versionConfidence = "exact";
        evidence.push({
          file,
          kind: "lockfile",
          excerpt: excerpt(`${versionPkg} ${exact}`),
        });
        break;
      }
    }
    if (
      !version &&
      range &&
      range !== "*" &&
      !/^(link:|workspace:|file:)/.test(range)
    ) {
      version = range;
      versionConfidence = "range";
    }
  }

  const tech_: DetectedTech = {
    slug: tech.slug,
    name: tech.name,
    category: tech.category,
    evidence,
    packagePaths: [...packagePaths],
  };
  if (tech.iconRef) tech_.iconRef = tech.iconRef;
  if (version) tech_.version = version;
  if (versionConfidence) tech_.versionConfidence = versionConfidence;
  return tech_;
}

// ── Layer 4: disambiguators ─────────────────────────────────────

function major(version: string | undefined): number | null {
  const match = /^[^\d]*(\d+)/.exec(version ?? "");
  return match?.[1] ? Number(match[1]) : null;
}

function applyDisambiguators(
  techs: DetectedTech[],
  input: EngineInput,
): { packageManager?: "pnpm" | "yarn" | "npm" | "bun" } {
  const bySlug = new Map(techs.map((t) => [t.slug, t]));

  const tailwind = bySlug.get("tailwind");
  if (tailwind) {
    const m = major(tailwind.version);
    const postcssV4 = tailwind.evidence.some(
      (e) => e.kind === "config-pattern" && e.excerpt.includes("@tailwindcss/postcss"),
    );
    if (m !== null) tailwind.variant = `tailwind-v${m}`;
    else if (postcssV4) tailwind.variant = "tailwind-v4";
  }

  const next = bySlug.get("nextjs");
  if (next) {
    const hasAppDir = input.treePaths.some((p) =>
      /^(src\/)?app\/.*layout\.(tsx?|jsx?)$/.test(p),
    );
    next.variant = hasAppDir ? "app-router" : "pages-router";
  }

  const react = bySlug.get("react");
  if (react) {
    const m = major(react.version);
    if (m !== null) react.variant = `react-${m}`;
  }

  // Package manager: lockfile > packageManager field > engines (02 §3 L4)
  let packageManager: "pnpm" | "yarn" | "npm" | "bun" | undefined;
  const has = (f: string) => input.treePaths.includes(f);
  if (has("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (has("bun.lockb") || has("bun.lock")) packageManager = "bun";
  else if (has("yarn.lock")) packageManager = "yarn";
  else if (has("package-lock.json")) packageManager = "npm";
  else {
    const rootPkg = parseJson(input.files.get("package.json") ?? "");
    const pm = rootPkg?.packageManager;
    if (typeof pm === "string") {
      const name = pm.split("@")[0];
      if (name === "pnpm" || name === "yarn" || name === "npm" || name === "bun") {
        packageManager = name;
      }
    }
  }
  return packageManager ? { packageManager } : {};
}

// ── Entry point ─────────────────────────────────────────────────

export function runDetection(input: EngineInput): DetectionResult {
  const started = Date.now();
  const workspaces = findWorkspaces(input);
  const depMaps = buildDepMaps(input, workspaces);
  const locks = buildLockfileVersions(input);

  const techs: DetectedTech[] = [];
  for (const tech of TECHNOLOGIES) {
    const hit = detectTech(tech, input, depMaps, locks);
    if (hit) techs.push(hit);
  }
  const { packageManager } = applyDisambiguators(techs, input);

  const result: DetectionResult = {
    techs,
    manifestsRead: [...input.files.keys()],
    languages: input.languages,
    isMonorepo: workspaces.length > 0,
    workspaces,
    largeRepo: input.largeRepo,
    durationMs: Date.now() - started,
  };
  if (packageManager) result.packageManager = packageManager;
  return result;
}
