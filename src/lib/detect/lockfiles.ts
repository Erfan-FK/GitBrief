import { parse as parseYaml } from "yaml";

/**
 * Lockfile version extraction — 02 §3 Layer 3.
 * Each parser returns Map<depName, exactVersion>. Exact installed versions
 * come ONLY from here; manifest ranges are confidence:'range'.
 */

export type VersionMap = Map<string, string>;

function stripPeerSuffix(version: string): string {
  // pnpm: "15.3.0(react@19.0.0)" → "15.3.0"
  const idx = version.indexOf("(");
  return idx === -1 ? version : version.slice(0, idx);
}

export function parsePnpmLock(content: string): VersionMap {
  const out: VersionMap = new Map();
  let doc: unknown;
  try {
    doc = parseYaml(content, { maxAliasCount: -1 });
  } catch {
    return out;
  }
  if (typeof doc !== "object" || doc === null) return out;
  const importers =
    "importers" in doc && typeof doc.importers === "object"
      ? (doc.importers as Record<string, unknown>)
      : { ".": doc }; // v5 lockfiles keep root deps top-level
  for (const importer of Object.values(importers)) {
    if (typeof importer !== "object" || importer === null) continue;
    for (const key of ["dependencies", "devDependencies"] as const) {
      const deps = (importer as Record<string, unknown>)[key];
      if (typeof deps !== "object" || deps === null) continue;
      for (const [name, value] of Object.entries(deps)) {
        let version: string | undefined;
        if (typeof value === "string") version = value; // v5: "15.3.0"
        else if (
          typeof value === "object" &&
          value !== null &&
          "version" in value &&
          typeof value.version === "string"
        ) {
          version = value.version; // v9: {specifier, version}
        }
        if (
          version &&
          !out.has(name) &&
          !version.startsWith("link:") &&
          !version.startsWith("workspace:") &&
          !version.startsWith("file:")
        ) {
          out.set(name, stripPeerSuffix(version));
        }
      }
    }
  }
  return out;
}

export function parsePackageLock(content: string): VersionMap {
  const out: VersionMap = new Map();
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    return out;
  }
  if (typeof doc !== "object" || doc === null) return out;
  const packages =
    "packages" in doc && typeof doc.packages === "object"
      ? (doc.packages as Record<string, unknown>)
      : null;
  if (packages) {
    // v2/v3
    for (const [path, entry] of Object.entries(packages)) {
      const marker = "node_modules/";
      const idx = path.lastIndexOf(marker);
      if (idx === -1) continue;
      const name = path.slice(idx + marker.length);
      if (
        typeof entry === "object" &&
        entry !== null &&
        "version" in entry &&
        typeof entry.version === "string" &&
        !out.has(name)
      ) {
        out.set(name, entry.version);
      }
    }
    return out;
  }
  // v1
  const deps =
    "dependencies" in doc && typeof doc.dependencies === "object"
      ? (doc.dependencies as Record<string, unknown>)
      : {};
  for (const [name, entry] of Object.entries(deps)) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "version" in entry &&
      typeof entry.version === "string"
    ) {
      out.set(name, entry.version);
    }
  }
  return out;
}

export function parseYarnLock(content: string): VersionMap {
  const out: VersionMap = new Map();
  if (content.includes("__metadata:")) {
    // Berry: yaml with '"name@npm:range", ...' keys
    let doc: unknown;
    try {
      doc = parseYaml(content, { maxAliasCount: -1 });
    } catch {
      return out;
    }
    if (typeof doc !== "object" || doc === null) return out;
    for (const [key, entry] of Object.entries(doc as Record<string, unknown>)) {
      if (key === "__metadata") continue;
      if (
        typeof entry !== "object" ||
        entry === null ||
        !("version" in entry) ||
        typeof entry.version !== "string"
      ) {
        continue;
      }
      for (const spec of key.split(",")) {
        const at = spec.trim().lastIndexOf("@");
        if (at <= 0) continue;
        const name = spec.trim().slice(0, at);
        if (!out.has(name)) out.set(name, entry.version);
      }
    }
    return out;
  }
  // Classic: header lines `"name@range", name@range:` then `  version "x"`
  const lines = content.split("\n");
  let currentNames: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#") || line.trim() === "") continue;
    if (!line.startsWith(" ") && line.trimEnd().endsWith(":")) {
      currentNames = line
        .trimEnd()
        .slice(0, -1)
        .split(",")
        .map((spec) => {
          const cleaned = spec.trim().replace(/^"|"$/g, "");
          const at = cleaned.lastIndexOf("@");
          return at > 0 ? cleaned.slice(0, at) : cleaned;
        });
    } else {
      const match = /^\s{2}version\s+"?([^"\s]+)"?/.exec(line);
      if (match?.[1]) {
        for (const name of currentNames) {
          if (!out.has(name)) out.set(name, match[1]);
        }
      }
    }
  }
  return out;
}

/** TOML [[package]] name/version pairs — poetry.lock, uv.lock, Cargo.lock. */
export function parseTomlPackages(content: string): VersionMap {
  const out: VersionMap = new Map();
  const blocks = content.split(/\[\[package\]\]/).slice(1);
  for (const block of blocks) {
    const name = /\bname\s*=\s*"([^"]+)"/.exec(block)?.[1];
    const version = /\bversion\s*=\s*"([^"]+)"/.exec(block)?.[1];
    if (name && version && !out.has(name.toLowerCase())) {
      out.set(name.toLowerCase(), version);
    }
  }
  return out;
}

export function parseGoMod(content: string): VersionMap {
  const out: VersionMap = new Map();
  const requireBlocks = content.match(/require\s*\(([\s\S]*?)\)/g) ?? [];
  const singles = content.match(/^require\s+\S+\s+v\S+/gm) ?? [];
  const lines: string[] = [];
  for (const block of requireBlocks) {
    lines.push(...block.replace(/require\s*\(|\)/g, "").split("\n"));
  }
  lines.push(...singles.map((line) => line.replace(/^require\s+/, "")));
  for (const line of lines) {
    const match = /^\s*(\S+)\s+v(\S+?)(?:\s*\/\/.*)?$/.exec(line);
    if (match?.[1] && match[2] && !match[1].startsWith("//")) {
      out.set(match[1], match[2]);
    }
  }
  return out;
}

export function parseComposerLock(content: string): VersionMap {
  const out: VersionMap = new Map();
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    return out;
  }
  if (typeof doc !== "object" || doc === null) return out;
  for (const key of ["packages", "packages-dev"] as const) {
    const packages =
      key in doc && Array.isArray((doc as Record<string, unknown>)[key])
        ? ((doc as Record<string, unknown>)[key] as unknown[])
        : [];
    for (const pkg of packages) {
      if (
        typeof pkg === "object" &&
        pkg !== null &&
        "name" in pkg &&
        "version" in pkg &&
        typeof pkg.name === "string" &&
        typeof pkg.version === "string"
      ) {
        out.set(pkg.name, pkg.version.replace(/^v/, ""));
      }
    }
  }
  return out;
}

export function parseGemfileLock(content: string): VersionMap {
  const out: VersionMap = new Map();
  const gemSection = /GEM\n([\s\S]*?)\n\n/.exec(content)?.[1] ?? content;
  for (const line of gemSection.split("\n")) {
    // exactly 4-space indent = direct spec entries
    const match = /^ {4}([\w-]+) \(([\d][^)]*)\)/.exec(line);
    if (match?.[1] && match[2]) out.set(match[1], match[2]);
  }
  return out;
}

export interface LockfileInfo {
  file: string;
  ecosystem: "npm" | "pypi" | "cargo" | "go" | "composer" | "gem";
  parse: (content: string) => VersionMap;
}

/** Recognized lockfiles in priority order — first hit per ecosystem wins. */
export const LOCKFILES: LockfileInfo[] = [
  { file: "pnpm-lock.yaml", ecosystem: "npm", parse: parsePnpmLock },
  { file: "package-lock.json", ecosystem: "npm", parse: parsePackageLock },
  { file: "yarn.lock", ecosystem: "npm", parse: parseYarnLock },
  { file: "poetry.lock", ecosystem: "pypi", parse: parseTomlPackages },
  { file: "uv.lock", ecosystem: "pypi", parse: parseTomlPackages },
  { file: "Cargo.lock", ecosystem: "cargo", parse: parseTomlPackages },
  { file: "go.mod", ecosystem: "go", parse: parseGoMod },
  { file: "composer.lock", ecosystem: "composer", parse: parseComposerLock },
  { file: "Gemfile.lock", ecosystem: "gem", parse: parseGemfileLock },
];
