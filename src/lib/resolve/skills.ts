import Anthropic from "@anthropic-ai/sdk";
import { sanitizeSkill } from "@/lib/resolve/sanitize";
import { validateSkillFrontmatter } from "@/lib/validate";
import { TECH_BY_SLUG } from "@/lib/detect/registry";
import {
  GENERATION_MODEL,
  GENERATION_TEMPERATURE,
} from "@/lib/generate/models";
import type { DetectedTech } from "@/lib/detect/types";

/**
 * Skill resolution — 02 §6. Official first; generate only with retrievable
 * grounding; otherwise SKIP with a reason (never train-data-only).
 */

export interface ResolvedSkill {
  slug: string;
  path: string; // bundle path
  status: "complete" | "skipped";
  origin?: "official" | "generated";
  content?: string;
  skipReason?: string;
  provenance: {
    sources: { url: string; kind: "official" | "llms" | "docs" }[];
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
  "ai",
]);

function skillDirName(tech: DetectedTech): string {
  const major = /^(\d+)/.exec(tech.version ?? "")?.[1];
  return major ? `${tech.slug}-${major}` : tech.slug;
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
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

const SKILL_SYSTEM = (tech: string, version: string) =>
  `You write a SKILL.md teaching an AI coding agent to use ${tech} ${version} correctly. You are given GROUNDING excerpts from current official documentation. HARD RULES: (1) Every API name, import path, config key, and code pattern MUST appear in the GROUNDING text — if it does not, do not mention it. (2) Target this exact version; include a "version notes" section ONLY if grounding shows breaking changes from the previous major. (3) ≤2500 tokens. (4) Structure: YAML frontmatter (name: {tech}-{major}, description: one sentence with WHEN to use), then: Setup/Config as used in this stack, Core patterns (3-5, code blocks), Common mistakes (from grounding only), References (source URLs). (5) Markdown only.`;

async function generateSkill(
  tech: DetectedTech,
  coStack: string[],
): Promise<ResolvedSkill> {
  const path = `.claude/skills/${skillDirName(tech)}/SKILL.md`;
  const skipped = (reason: string): ResolvedSkill => ({
    slug: tech.slug,
    path,
    status: "skipped",
    skipReason: reason,
    provenance: { sources: [], fetchedAt: new Date().toISOString() },
  });

  if (!process.env.ANTHROPIC_API_KEY) return skipped("no-api-key");

  // Grounding: vendor llms.txt first (02 §6.4); Context7 optional via key.
  const registryEntry = TECH_BY_SLUG.get(tech.slug);
  const groundingSources: { url: string; kind: "llms" | "docs" }[] = [];
  let grounding = "";

  const llmsCandidates = [
    registryEntry?.llmsTxtUrl,
    registryEntry?.homepage ? `${registryEntry.homepage}/llms.txt` : undefined,
  ].filter((u): u is string => Boolean(u));
  for (const url of llmsCandidates) {
    const text = await fetchText(url);
    if (text && !text.trimStart().startsWith("<")) {
      grounding = text.slice(0, 24000); // ≤6000 tokens
      groundingSources.push({ url, kind: "llms" });
      break;
    }
  }

  if (!grounding) return skipped("no-grounding-retrievable");

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 3500,
      temperature: GENERATION_TEMPERATURE,
      system: SKILL_SYSTEM(tech.name, tech.version ?? "latest"),
      messages: [
        {
          role: "user",
          content: `TECH: ${tech.slug}@${tech.version ?? "latest"} · CONTEXT: used with ${coStack.join(", ")}\nGROUNDING:\n${groundingSources.map((s) => `[source: ${s.url}]`).join("\n")}\n${grounding}`,
        },
      ],
    });
    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
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
    framework: 0, styling: 1, database: 2, auth: 3, ai: 4,
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
    .slice(0, 8); // cap per-run skill count
  const coStack = techs.slice(0, 10).map((t) => t.name);

  const settled = await Promise.allSettled(
    worthy.map(async (tech) => {
      const official = await resolveOfficial(tech);
      if (official) return official;
      return generateSkill(tech, coStack);
    }),
  );

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
