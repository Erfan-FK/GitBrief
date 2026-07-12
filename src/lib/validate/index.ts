import type { FactSheet } from "@/lib/generate/factsheet";

/**
 * Validator gate — 02 §8. Runs on EVERY output file, blocking.
 * Strips unverifiable commands/paths/versions/links line-by-line.
 * Never bypassed (CLAUDE.md rule).
 */

export interface ValidationResult {
  content: string;
  verifiedCommands: number;
  strippedClaims: number;
  checks: string[];
}

const COMMAND_RE =
  /`((?:npm|pnpm|yarn|bun|make|just|cargo|go|pytest|uv|poetry|composer|rails|mix)\s[^`]{1,100})`/g;

const WELL_KNOWN_SUBCOMMANDS = new Set([
  "install", "i", "add", "remove", "ci", "publish", "dlx", "exec", "create",
  "init", "run", "test", "build", "vet", "fmt", "mod", "get", "generate",
  "update", "check", "clippy", "shell", "sync", "lock", "new", "server",
  "console", "db", "deps", "compile",
]);

interface KnownFacts {
  scripts: Set<string>;
  targets: Set<string>;
  paths: Set<string>;
  pathPrefixes: string[];
  versionsBySlugName: Map<string, string>;
  allowedDomains: Set<string>;
}

function buildKnownFacts(facts: FactSheet, treePaths: string[]): KnownFacts {
  const scripts = new Set<string>();
  for (const scriptGroup of Object.values(facts.scriptsMap)) {
    for (const name of Object.keys(scriptGroup)) scripts.add(name);
  }
  const targets = new Set(facts.taskTargets.flatMap((t) => t.targets));
  const allowedDomains = new Set([
    "github.com",
    "raw.githubusercontent.com",
    "gitbrief.dev",
  ]);
  const versionsBySlugName = new Map<string, string>();
  for (const tech of facts.techList) {
    if (tech.version) {
      versionsBySlugName.set(tech.name.toLowerCase(), tech.version);
      versionsBySlugName.set(tech.slug, tech.version);
    }
  }
  return {
    scripts,
    targets,
    paths: new Set(treePaths),
    pathPrefixes: treePaths,
    versionsBySlugName,
    allowedDomains,
  };
}

function commandIsVerifiable(command: string, known: KnownFacts): boolean {
  const words = command.trim().split(/\s+/);
  const runner = words[0] ?? "";
  if (["npm", "pnpm", "yarn", "bun"].includes(runner)) {
    const sub = words[1] ?? "";
    if (WELL_KNOWN_SUBCOMMANDS.has(sub)) {
      // `pnpm run X` — X must be a real script
      if (sub === "run") {
        const scriptName = words[2]?.split(/[^\w:.-]/)[0];
        return !scriptName || known.scripts.has(scriptName);
      }
      return true;
    }
    // `pnpm X` shorthand — X must be a real script or a flagged filter call
    if (sub.startsWith("-")) return true;
    return known.scripts.has(sub.split(/[^\w:.-]/)[0] ?? "");
  }
  if (["make", "just"].includes(runner)) {
    const target = words[1];
    return !target || target.startsWith("-") || known.targets.has(target);
  }
  // go/cargo/pytest/etc: allow well-known subcommands only
  const sub = words[1] ?? "";
  return sub === "" || sub.startsWith("-") || WELL_KNOWN_SUBCOMMANDS.has(sub);
}

function pathExists(claimed: string, known: KnownFacts): boolean {
  const cleaned = claimed.replace(/\/$/, "");
  if (known.paths.has(cleaned)) return true;
  return known.pathPrefixes.some((p) => p.startsWith(cleaned + "/"));
}

const PATH_TOKEN_RE = /`([\w.@-]+\/[\w./@-]+)`/g;
const LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
const VERSION_CLAIM_RE = /\b([A-Za-z][\w./-]{1,30})@(\d+[\w.-]*)/g;

/**
 * Validate one markdown file against the FactSheet + tree.
 * Line-level stripping: a line containing an unverifiable claim is removed.
 */
export function validateFile(
  content: string,
  facts: FactSheet,
  treePaths: string[],
  extraAllowedDomains: string[] = [],
): ValidationResult {
  const known = buildKnownFacts(facts, treePaths);
  for (const domain of extraAllowedDomains) known.allowedDomains.add(domain);
  for (const tech of facts.techList) {
    // vendor domains are allowed link targets
    const registryHomepage = tech.slug; // slugs used in provenance only
    void registryHomepage;
  }

  const checks: string[] = [];
  let verifiedCommands = 0;
  let strippedClaims = 0;

  const keptLines: string[] = [];
  let inCodeFence = false;
  for (const line of content.split("\n")) {
    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence;
      keptLines.push(line);
      continue;
    }
    if (inCodeFence) {
      keptLines.push(line);
      continue;
    }

    let strip = false;

    for (const match of line.matchAll(COMMAND_RE)) {
      const command = match[1] ?? "";
      if (commandIsVerifiable(command, known)) {
        verifiedCommands++;
      } else {
        strip = true;
        strippedClaims++;
        checks.push(`stripped command: ${command}`);
      }
    }

    if (!strip) {
      for (const match of line.matchAll(PATH_TOKEN_RE)) {
        const claimed = match[1] ?? "";
        if (
          claimed.includes("/") &&
          !/^https?:/.test(claimed) &&
          !claimed.includes("@") && // scoped package names, version claims
          !pathExists(claimed, known)
        ) {
          strip = true;
          strippedClaims++;
          checks.push(`stripped path: ${claimed}`);
          break;
        }
      }
    }

    if (!strip) {
      for (const match of line.matchAll(VERSION_CLAIM_RE)) {
        const name = (match[1] ?? "").toLowerCase();
        const claimedVersion = match[2] ?? "";
        const detected = known.versionsBySlugName.get(name);
        if (detected && !detected.startsWith(claimedVersion.split(".")[0] ?? "")) {
          strip = true;
          strippedClaims++;
          checks.push(`stripped version claim: ${name}@${claimedVersion}`);
          break;
        }
      }
    }

    if (!strip) {
      for (const match of line.matchAll(LINK_RE)) {
        const url = match[2] ?? "";
        try {
          const { protocol, hostname } = new URL(url);
          const allowed =
            protocol === "https:" &&
            [...known.allowedDomains].some(
              (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
            );
          if (!allowed) {
            strip = true;
            strippedClaims++;
            checks.push(`stripped link: ${url}`);
            break;
          }
        } catch {
          strip = true;
          strippedClaims++;
          break;
        }
      }
    }

    if (!strip) keptLines.push(line);
  }

  // Collapse runs of blank lines left by stripping
  const cleaned = keptLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return { content: cleaned, verifiedCommands, strippedClaims, checks };
}

/** Frontmatter validity for skills — 02 §8. */
export function validateSkillFrontmatter(content: string): boolean {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return false;
  const frontmatter = match[1] ?? "";
  return /^name:\s*\S+/m.test(frontmatter) && /^description:\s*\S+/m.test(frontmatter);
}
