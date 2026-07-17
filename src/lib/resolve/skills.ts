import { sanitizeSkill } from "@/lib/resolve/sanitize";
import { validateSkillFrontmatter } from "@/lib/validate";
import { TECH_BY_SLUG } from "@/lib/detect/registry";
import { anthropicClient, GENERATION_MODEL } from "@/lib/generate/models";
import type { DetectedTech } from "@/lib/detect/types";

/**
 * Skill resolution — 02 §6. Official first; generate only with retrievable
 * grounding; otherwise SKIP with a reason (never train-data-only).
 *
 * Grounding chain: official SKILL.md → vendor llms.txt → Context7 REST API
 * (search → docs). Context7 covers virtually every published library, so a
 * detected tech now almost always ships a real version-matched skill instead
 * of a skipped row.
 */

export interface ResolvedSkill {
  slug: string;
  path: string; // bundle path
  status: "complete" | "skipped";
  origin?: "official" | "generated";
  content?: string;
  skipReason?: string;
  provenance: {
    sources: { url: string; kind: "official" | "llms" | "context7" | "docs" }[];
    fetchedAt: string;
    verifiedClaims?: number;
    totalClaims?: number;
  };
}

/** Official skill sources — verified fetchable 2026-07 (03 §4). */
const OFFICIAL_SOURCES: Record<string, string> = {
  supabase:
    "https://raw.githubusercontent.com/supabase/agent-skills/main/skills/supabase/SKILL.md",
  anthropic:
    "https://raw.githubusercontent.com/anthropics/skills/main/skills/claude-api/SKILL.md",
};

/** Techs worth a skill file (frameworks + key libs, not languages/infra). */
const SKILL_WORTHY_CATEGORIES = new Set([
  "framework",
  "styling",
  "database",
  "auth",
  "testing",
  "ai",
]);

/**
 * Skill `name` must not contain the reserved words "anthropic"/"claude"
 * (platform frontmatter rules) — remap the affected slugs.
 */
const NAME_SAFE_SLUG: Record<string, string> = {
  anthropic: "messages-api",
};

function skillDirName(tech: DetectedTech): string {
  const safeSlug = NAME_SAFE_SLUG[tech.slug] ?? tech.slug;
  const major = /^(\d+)/.exec(tech.version ?? "")?.[1];
  return major ? `${safeSlug}-${major}` : safeSlug;
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function resolveOfficial(tech: DetectedTech): Promise<ResolvedSkill | null> {
  const url = OFFICIAL_SOURCES[tech.slug];
  if (!url) return null;
  const raw = await fetchText(url);
  if (!raw) return null;
  const sanitized = sanitizeSkill(raw, url);
  if (sanitized.quarantined) {
    return {
      slug: tech.slug,
      path: `.claude/skills/${skillDirName(tech)}/SKILL.md`,
      status: "skipped",
      skipReason: `official skill quarantined: ${sanitized.reason}`,
      provenance: {
        sources: [{ url, kind: "official" }],
        fetchedAt: new Date().toISOString(),
      },
    };
  }
  return {
    slug: tech.slug,
    path: `.claude/skills/${skillDirName(tech)}/SKILL.md`,
    status: "complete",
    origin: "official",
    content: sanitized.content,
    provenance: {
      sources: [{ url, kind: "official" }],
      fetchedAt: new Date().toISOString(),
    },
  };
}

// ── Context7 REST grounding ─────────────────────────────────────────────

interface Context7Result {
  id: string;
  title: string;
  trustScore?: number;
  verified?: boolean;
  totalTokens?: number;
}

/** Normalize a name for relevance matching: lowercase alphanumerics only. */
function nameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve a tech to its best Context7 library id.
 * Relevance FIRST (title/id must actually contain the queried name — Context7
 * search happily returns adjacent libraries like better-auth for "Auth.js"),
 * then verified > trust > corpus size among the relevant set.
 */
async function context7Resolve(tech: DetectedTech): Promise<Context7Result | null> {
  const key = process.env.CONTEXT7_API_KEY;
  if (!key) return null;
  try {
    const registryEntry = TECH_BY_SLUG.get(tech.slug);
    const name = registryEntry?.name ?? tech.name;
    const res = await fetch(
      `https://context7.com/api/v1/search?query=${encodeURIComponent(name)}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Context7Result[] };
    const results = data.results ?? [];
    if (results.length === 0) return null;

    // Accept a result only if the queried name (or the tech slug — "nextauth"
    // matches /nextauthjs/next-auth where "Auth.js" would not) appears in its
    // title or library id.
    const keys = [nameKey(name), nameKey(tech.slug), nameKey(tech.name)].filter(
      (k) => k.length >= 3,
    );
    const relevant = results.filter((r) => {
      const hay = nameKey(r.title) + " " + nameKey(r.id);
      return keys.some((k) => hay.includes(k));
    });
    if (relevant.length === 0) return null; // wrong-library grounding is worse than none

    const scored = [...relevant].sort((a, b) => {
      const v = Number(b.verified ?? false) - Number(a.verified ?? false);
      if (v !== 0) return v;
      const t = (b.trustScore ?? 0) - (a.trustScore ?? 0);
      if (t !== 0) return t;
      return (b.totalTokens ?? 0) - (a.totalTokens ?? 0);
    });
    return scored[0] ?? null;
  } catch {
    return null;
  }
}

/** Fetch grounding text for a resolved Context7 library. */
async function context7Docs(
  libraryId: string,
  topic: string | null,
  tokens: number,
): Promise<string | null> {
  const key = process.env.CONTEXT7_API_KEY;
  if (!key) return null;
  const topicParam = topic ? `&topic=${encodeURIComponent(topic)}` : "";
  const url = `https://context7.com/api/v1${libraryId}?type=txt&tokens=${tokens}${topicParam}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 200 ? text : null;
  } catch {
    return null;
  }
}

// ── Generation ──────────────────────────────────────────────────────────

const SKILL_SYSTEM = (
  name: string,
  tech: string,
  version: string,
) => `You write a SKILL.md teaching an AI coding agent to use ${tech} ${version} correctly INSIDE ONE SPECIFIC REPOSITORY. You are given GROUNDING excerpts from current official documentation plus REPO CONTEXT describing how this repository uses the technology.

Follow the Agent Skills spec and authoring best practices:
- YAML frontmatter: name: ${name} (exactly this), description: third person, ≤500 chars, states WHAT the skill covers and WHEN to use it, with concrete trigger keywords (file types, APIs, tasks).
- Body ≤300 lines. Assume the agent is already a strong engineer: no basics, no tutorials, no marketing.
- Structure: ## Setup in this repo (how THIS repo wires the tech — cite the real package paths / configs from REPO CONTEXT) · ## Core patterns (3–6, each a titled code block taken from GROUNDING, adapted to this version) · ## Common mistakes (only ones evidenced in GROUNDING) · ## Version notes (ONLY if GROUNDING shows breaking changes near ${version}) · ## References (source URLs).
- Provide ONE recommended approach per problem, not a menu.
- Consistent terminology throughout.

HARD RULES:
(1) Every API name, import path, config key, and code pattern MUST appear in the GROUNDING text — if it does not, do not mention it.
(2) Target version ${version} specifically.
(3) Never invent repo paths — only those given in REPO CONTEXT.
(4) Markdown only, starting with the frontmatter block.`;

async function generateSkill(
  tech: DetectedTech,
  coStack: string[],
): Promise<ResolvedSkill> {
  const dirName = skillDirName(tech);
  const path = `.claude/skills/${dirName}/SKILL.md`;
  const skipped = (reason: string): ResolvedSkill => ({
    slug: tech.slug,
    path,
    status: "skipped",
    skipReason: reason,
    provenance: { sources: [], fetchedAt: new Date().toISOString() },
  });

  if (!process.env.ANTHROPIC_API_KEY) return skipped("no-api-key");

  const registryEntry = TECH_BY_SLUG.get(tech.slug);
  const groundingSources: { url: string; kind: "llms" | "context7" | "docs" }[] = [];
  const groundingParts: string[] = [];

  // 1. Vendor llms.txt (author-curated, highest signal when present)
  const llmsCandidates = [
    registryEntry?.llmsTxtUrl,
    registryEntry?.homepage ? `${registryEntry.homepage}/llms.txt` : undefined,
  ].filter((u): u is string => Boolean(u));
  for (const url of llmsCandidates) {
    const text = await fetchText(url);
    if (text && !text.trimStart().startsWith("<")) {
      groundingParts.push(`[source: ${url}]\n${text.slice(0, 20000)}`);
      groundingSources.push({ url, kind: "llms" });
      break;
    }
  }

  // 2. Context7 — covers nearly every library; version-topical query
  const library = await context7Resolve(tech);
  if (library) {
    const major = /^(\d+)/.exec(tech.version ?? "")?.[1];
    const topic = major ? `setup configuration patterns v${major}` : null;
    const docs =
      (await context7Docs(library.id, topic, 6000)) ??
      (await context7Docs(library.id, null, 6000));
    if (docs) {
      const sourceUrl = `https://context7.com${library.id}`;
      groundingParts.push(`[source: ${sourceUrl}]\n${docs.slice(0, 26000)}`);
      groundingSources.push({ url: sourceUrl, kind: "context7" });
    }
  }

  if (groundingParts.length === 0) return skipped("no-grounding-retrievable");

  // Repo usage context — makes the skill about THIS repo, not generic docs.
  const usedIn = tech.packagePaths.filter(Boolean);
  const repoContext = [
    `technology: ${tech.name}@${tech.version ?? "unknown"}${tech.variant ? ` (variant: ${tech.variant})` : ""}`,
    usedIn.length > 0
      ? `used in workspace packages: ${usedIn.slice(0, 6).join(", ")}`
      : "used at the repository root",
    `co-installed stack: ${coStack.join(", ")}`,
    `detection evidence: ${tech.evidence
      .slice(0, 3)
      .map((e) => `${e.file} (${e.excerpt})`)
      .join(" · ")}`,
  ].join("\n");

  try {
    const client = await anthropicClient();
    const response = await client.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 4500,
      // Skill writing is synthesis of supplied grounding text — thinking
      // roughly doubles per-skill latency for no measurable quality gain,
      // and 6+ skills run inside the stream's wall-clock budget.
      thinking: { type: "disabled" },
      system: SKILL_SYSTEM(dirName, tech.name, tech.version ?? "latest"),
      messages: [
        {
          role: "user",
          content: `REPO CONTEXT\n${repoContext}\n\nGROUNDING\n${groundingParts.join("\n\n")}`,
        },
      ],
    });
    let content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .replace(/^```(?:markdown|md)?\n?/, "")
      .replace(/\n?```$/, "");
    // Salvage preamble chatter: keep from the first frontmatter fence on.
    if (!content.startsWith("---")) {
      const fenceAt = content.indexOf("\n---\n");
      if (fenceAt !== -1) content = content.slice(fenceAt + 1);
    }
    if (!validateSkillFrontmatter(content)) {
      return skipped("generated-skill-invalid-frontmatter");
    }
    return {
      slug: tech.slug,
      path,
      status: "complete",
      origin: "generated",
      content,
      provenance: {
        sources: groundingSources,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return skipped(
      `generation-failed: ${error instanceof Error ? error.message.slice(0, 80) : "unknown"}`,
    );
  }
}

/** Resolve skills for all skill-worthy techs — Promise.allSettled per 02 §5:
 * single-skill failure NEVER fails the run. */
export async function resolveSkills(
  techs: DetectedTech[],
): Promise<ResolvedSkill[]> {
  const CATEGORY_WEIGHT: Record<string, number> = {
    framework: 0, styling: 1, database: 2, auth: 3, testing: 4, ai: 5,
  };
  const worthy = techs
    .filter((tech) => SKILL_WORTHY_CATEGORIES.has(tech.category))
    .sort((a, b) => {
      // Official skills first (free fetch, highest value), then root-level
      // techs — example-dir frameworks shouldn't eat slots.
      const aOfficial = a.slug in OFFICIAL_SOURCES ? 0 : 1;
      const bOfficial = b.slug in OFFICIAL_SOURCES ? 0 : 1;
      if (aOfficial !== bOfficial) return aOfficial - bOfficial;
      const aRoot = a.packagePaths.includes("") ? 0 : 1;
      const bRoot = b.packagePaths.includes("") ? 0 : 1;
      if (aRoot !== bRoot) return aRoot - bRoot;
      return (
        (CATEGORY_WEIGHT[a.category] ?? 9) - (CATEGORY_WEIGHT[b.category] ?? 9)
      );
    })
    .slice(0, 10); // cap per-run skill count
  const coStack = techs.slice(0, 10).map((t) => t.name);

  // Bounded concurrency: a full-parallel fan-out of long generation calls
  // drops connections behind constrained networks/proxies, and bursts rate
  // limits. Two lanes keeps wall time reasonable without the failures.
  const CONCURRENCY = 3;
  const results: PromiseSettledResult<ResolvedSkill>[] = new Array(worthy.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, worthy.length) }, async () => {
      while (next < worthy.length) {
        const i = next++;
        const tech = worthy[i]!;
        const t0 = Date.now();
        try {
          const official = await resolveOfficial(tech);
          results[i] = {
            status: "fulfilled",
            value: official ?? (await generateSkill(tech, coStack)),
          };
        } catch (reason) {
          results[i] = { status: "rejected", reason };
        }
        console.warn(
          `[gitbrief] skill ${tech.slug} took ${Math.round((Date.now() - t0) / 1000)}s`,
        );
      }
    }),
  );
  const settled = results;

  return settled.map((result, i) => {
    const tech = worthy[i];
    if (result.status === "fulfilled") return result.value;
    return {
      slug: tech?.slug ?? "unknown",
      path: `.claude/skills/${tech ? skillDirName(tech) : "unknown"}/SKILL.md`,
      status: "skipped" as const,
      skipReason: "resolution-threw",
      provenance: { sources: [], fetchedAt: new Date().toISOString() },
    };
  });
}
