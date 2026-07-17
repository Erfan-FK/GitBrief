/**
 * Source-file sampling — picks the handful of files that teach the generator
 * what this repo actually does (02 §7.2 `sampledConventionFiles`, expanded).
 *
 * Research basis: repo-level doc quality tracks how much *relevant source*
 * the model sees (RepoAgent; ReCUBE 2026 — relevance-guided file selection
 * beats breadth). We sample by role: entry point, API/handler, core module,
 * test, UI component, schema — capped hard so the prompt stays bounded.
 *
 * Samples are prompt-only context: they are NEVER persisted (02 §11) and are
 * secret-scrubbed before leaving this module.
 */

export interface SampledFile {
  path: string;
  role:
    | "entry-point"
    | "api-handler"
    | "core-module"
    | "test"
    | "ui-component"
    | "schema";
  /** Scrubbed + truncated content. */
  excerpt: string;
  truncated: boolean;
}

const MAX_FILES = 7;
const MAX_CHARS_PER_FILE = 6000;
const MAX_LINES_PER_FILE = 160;

const SOURCE_EXT =
  /\.(ts|tsx|js|jsx|mjs|py|go|rs|rb|php|java|kt|swift|cc?|cpp|hpp|h|cs|ex|exs|scala|vue|svelte)$/;

const NOISE_DIRS =
  /(^|\/)(node_modules|vendor|dist|build|out|\.next|__pycache__|target|coverage|examples?|fixtures?|testdata|third_party|migrations)\//;

/** Same patterns as detection's evidence scrubber — keep in sync (02 §11). */
const SECRET_TOKEN_RES: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bsk-[A-Za-z0-9-]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
];
const SECRET_ASSIGNMENT_RE =
  /((?:api[_-]?key|secret|token|password)["']?\s*[:=]\s*["']?)[^\s"',}]{8,}/gi;

function scrub(text: string): string {
  let out = text;
  for (const re of SECRET_TOKEN_RES) out = out.replace(re, "[redacted]");
  return out.replace(SECRET_ASSIGNMENT_RE, "$1[redacted]");
}

function truncate(content: string): { excerpt: string; truncated: boolean } {
  const lines = content.split("\n");
  let excerpt =
    lines.length > MAX_LINES_PER_FILE
      ? lines.slice(0, MAX_LINES_PER_FILE).join("\n")
      : content;
  let truncated = lines.length > MAX_LINES_PER_FILE;
  if (excerpt.length > MAX_CHARS_PER_FILE) {
    excerpt = excerpt.slice(0, MAX_CHARS_PER_FILE);
    truncated = true;
  }
  return { excerpt: scrub(excerpt), truncated };
}

const isSource = (p: string) => SOURCE_EXT.test(p) && !NOISE_DIRS.test(p);
const depth = (p: string) => p.split("/").length;
const base = (p: string) => p.slice(p.lastIndexOf("/") + 1).toLowerCase();

const isTest = (p: string) =>
  /(^|\/)(tests?|__tests__|spec)\//.test(p) ||
  /\.(test|spec)\.[jt]sx?$/.test(p) ||
  /_test\.(go|py|rb|ex|exs)$/.test(p) ||
  /(^|\/)test_[^/]+\.py$/.test(p);

/** Pick the sample set from tree paths. Pure — caller fetches contents. */
export function selectSamplePaths(treePaths: string[]): {
  path: string;
  role: SampledFile["role"];
}[] {
  const source = treePaths.filter(isSource);
  const picked = new Map<string, SampledFile["role"]>();
  const take = (path: string | undefined, role: SampledFile["role"]) => {
    if (path && !picked.has(path) && picked.size < MAX_FILES) {
      picked.set(path, role);
    }
  };
  // Shallow files first within every bucket — root/src beats deep nesting.
  const byDepth = (a: string, b: string) =>
    depth(a) - depth(b) || a.length - b.length;

  // 1. Entry point(s) — where execution starts.
  const entryNames = new Set([
    "main.ts", "main.tsx", "main.js", "main.py", "main.go", "main.rs",
    "index.ts", "index.tsx", "index.js", "app.ts", "app.js", "app.py",
    "server.ts", "server.js", "server.py", "cli.ts", "cli.py", "manage.py",
    "application.py", "app.tsx", "main.c", "main.cpp", "program.cs",
  ]);
  const entries = source
    .filter(
      (p) =>
        entryNames.has(base(p)) ||
        /^cmd\/[^/]+\/main\.go$/.test(p) ||
        /^(src\/)?app\/(page|layout)\.[jt]sx?$/.test(p),
    )
    .sort(byDepth);
  take(entries[0], "entry-point");
  if (entries[1] && depth(entries[1]) <= 3) take(entries[1], "entry-point");

  // 2. API route / handler / controller / view.
  const api = source
    .filter(
      (p) =>
        /(^|\/)(api|routes?|controllers?|handlers?|views|endpoints|resolvers)\//.test(p) &&
        !isTest(p),
    )
    .sort(byDepth);
  take(api[0], "api-handler");

  // 3. Core domain module — meaningful name in a source dir, not glue.
  const coreName =
    /(service|engine|core|model|store|db|repo|client|parser|process|manager|worker|scheduler|auth|util)/;
  const core = source
    .filter(
      (p) =>
        !isTest(p) &&
        !picked.has(p) &&
        /(^|\/)(src|lib|internal|pkg|app|core)\//.test(p) &&
        coreName.test(base(p)),
    )
    .sort(byDepth);
  take(core[0], "core-module");
  // fallback: shallowest non-test source file not yet picked
  if (!core[0]) {
    const fallback = source
      .filter((p) => !isTest(p) && !picked.has(p))
      .sort(byDepth);
    take(fallback[0], "core-module");
  }

  // 4. A test — teaches the testing conventions.
  const tests = source.filter(isTest).sort(byDepth);
  take(tests[0], "test");

  // 5. A UI component when it's a frontend repo.
  const component = source
    .filter((p) => /(^|\/)components?\//.test(p) && !isTest(p) && !picked.has(p))
    .sort(byDepth);
  take(component[0], "ui-component");

  // 6. Schema-ish files — data model ground truth.
  const schema = treePaths
    .filter(
      (p) =>
        !NOISE_DIRS.test(p) &&
        (/(^|\/)schema\.(sql|prisma|graphql|gql)$/.test(base(p) ? p : p) ||
          /(^|\/)(schema|models)\.(py|rb|go|ts)$/.test(p) ||
          /openapi\.(json|ya?ml)$/.test(p)),
    )
    .sort(byDepth);
  take(schema[0], "schema");

  // Fill remaining slots with the shallowest unpicked source files so tiny
  // repos still surface most of their code.
  for (const p of source.filter((p) => !picked.has(p)).sort(byDepth)) {
    if (picked.size >= MAX_FILES) break;
    picked.set(p, "core-module");
  }

  return [...picked.entries()].map(([path, role]) => ({ path, role }));
}

/** Fetch + scrub + truncate the selected samples. Failures skip silently. */
export async function collectSamples(
  treePaths: string[],
  alreadyFetched: Map<string, string>,
  fetchFile: (path: string) => Promise<string | null>,
): Promise<SampledFile[]> {
  const selections = selectSamplePaths(treePaths);
  const results = await Promise.allSettled(
    selections.map(async ({ path, role }) => {
      const content =
        alreadyFetched.get(path) ?? (await fetchFile(path));
      if (!content || content.length === 0) return null;
      const { excerpt, truncated } = truncate(content);
      return { path, role, excerpt, truncated } satisfies SampledFile;
    }),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<SampledFile> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value);
}
