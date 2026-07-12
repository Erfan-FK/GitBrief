import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  GENERATION_MODEL,
  GENERATION_TEMPERATURE,
} from "@/lib/generate/models";
import type { FactSheet } from "@/lib/generate/factsheet";

/** CanonicalBrief — one generation, all formats render from it (02 §7.1). */
export const canonicalBriefSchema = z.object({
  overview: z.string(),
  architecture_notes: z
    .array(z.object({ note: z.string(), evidence: z.string() }))
    .max(5),
  commands: z.record(z.string(), z.string()),
  conventions: z
    .array(z.object({ rule: z.string(), evidence: z.string() }))
    .max(6),
  structure_highlights: z
    .array(z.object({ path: z.string(), description: z.string() }))
    .max(8),
  gotchas: z.array(z.string()).max(3),
});
export type CanonicalBrief = z.infer<typeof canonicalBriefSchema>;

export type BriefOrigin = "generated" | "deterministic";

const SYSTEM_PROMPT = `You write operational briefings for AI coding agents. You are given a FactSheet extracted deterministically from a repository. HARD RULES: (1) Never invent commands, paths, versions, or config values — use FactSheet values verbatim. (2) Every architecture_note and convention MUST cite at least one file path from the FactSheet in its "evidence" field. (3) If you are not certain of a claim from the provided material, omit it. (4) Be terse: no marketing language, no restating obvious facts (do not say "this is a JavaScript project" when package.json is listed). (5) Output ONLY valid JSON matching the provided schema.`;

const RUN_PREFIX: Record<string, string> = {
  pnpm: "pnpm",
  yarn: "yarn",
  npm: "npm run",
  bun: "bun run",
};

/** Facts-only brief — the LLM-free floor (02 §7.2 failure path, and the
 * default while no ANTHROPIC_API_KEY is configured). */
export function deterministicBrief(facts: FactSheet): CanonicalBrief {
  const rootScripts = facts.scriptsMap[""] ?? {};
  const prefix = RUN_PREFIX[facts.packageManager ?? ""] ?? "npm run";
  const commands: Record<string, string> = {};
  for (const name of Object.keys(rootScripts)) {
    commands[name] = `${prefix} ${name}`;
  }
  for (const { file, targets } of facts.taskTargets) {
    const runner = file === "Makefile" ? "make" : "just";
    for (const target of targets.slice(0, 8)) {
      if (!commands[target]) commands[target] = `${runner} ${target}`;
    }
  }

  const frameworks = facts.techList.filter((t) => t.category === "framework");
  const stackLine = facts.techList
    .filter((t) => t.version)
    .slice(0, 8)
    .map((t) => `${t.name} ${t.version}`)
    .join(", ");

  return {
    overview:
      `${facts.repo.owner}/${facts.repo.name}` +
      (facts.repo.primaryLanguage ? ` — ${facts.repo.primaryLanguage}` : "") +
      (frameworks.length
        ? ` project using ${frameworks.map((f) => f.name).join(", ")}.`
        : " repository.") +
      (stackLine ? ` Stack: ${stackLine}.` : ""),
    architecture_notes: facts.workspaceTopology.slice(0, 5).map((ws) => ({
      note: `Workspace package${ws.name ? ` ${ws.name}` : ""} at ${ws.path}`,
      evidence: `${ws.path}/package.json`,
    })),
    commands,
    conventions: [],
    structure_highlights: facts.structureTree
      .filter((entry) => entry.endsWith("/") && entry.split("/").length === 2)
      .slice(0, 8)
      .map((path) => ({ path, description: "" })),
    gotchas: facts.largeRepo
      ? ["Large repo — analysis ran in manifest-only mode."]
      : [],
  };
}

export async function generateBrief(
  facts: FactSheet,
): Promise<{ brief: CanonicalBrief; origin: BriefOrigin }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { brief: deterministicBrief(facts), origin: "deterministic" };
  }
  const client = new Anthropic();
  const userContent = `FACTSHEET\n${JSON.stringify(facts)}\nProduce CanonicalBrief JSON.`;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: GENERATION_MODEL,
        max_tokens: 3000,
        temperature: GENERATION_TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              attempt === 0
                ? userContent
                : `${userContent}\nPrevious attempt failed schema validation: ${lastError}. Output ONLY corrected JSON.`,
          },
        ],
      });
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      const json: unknown = JSON.parse(
        text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, ""),
      );
      const parsed = canonicalBriefSchema.safeParse(json);
      if (parsed.success) return { brief: parsed.data, origin: "generated" };
      lastError = parsed.error.message.slice(0, 500);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown";
    }
  }
  // Second failure → minimal deterministic brief (02 §7.2)
  return { brief: deterministicBrief(facts), origin: "deterministic" };
}
