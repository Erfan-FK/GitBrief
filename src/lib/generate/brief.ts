import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { anthropicClient, GENERATION_MODEL } from "@/lib/generate/models";
import type { FactSheet } from "@/lib/generate/factsheet";

/**
 * CanonicalBrief — one generation, all formats render from it (02 §7.1).
 * v2 schema: depth-first. Structured so AGENTS.md can be a real "README for
 * agents" (agents.md standard) while CLAUDE.md stays terse and command-first
 * (Claude Code memory guidance): purpose/how-it-works carry the repo
 * explanation, key_modules carry the code map, conventions carry the rules.
 */
export const canonicalBriefSchema = z.object({
  /** What the project IS and DOES — concrete domain terms, 2–5 sentences. */
  purpose: z.string(),
  /** Runtime story end-to-end: input → processing → output, 3–8 sentences. */
  how_it_works: z.string(),
  architecture_notes: z
    .array(z.object({ note: z.string(), evidence: z.string() }))
    .max(8),
  /** Important files/dirs with SPECIFIC roles ("parses X into Y"). */
  key_modules: z
    .array(z.object({ path: z.string(), role: z.string() }))
    .max(12),
  commands: z.record(z.string(), z.string()),
  conventions: z
    .array(z.object({ rule: z.string(), evidence: z.string() }))
    .max(10),
  structure_highlights: z
    .array(z.object({ path: z.string(), description: z.string() }))
    .max(12),
  /** Environment prerequisites: env vars, runtimes, services. */
  setup: z.array(z.string()).max(8),
  /** How testing works in THIS repo ("" when none detected). */
  testing: z.string(),
  gotchas: z.array(z.string()).max(6),
});
export type CanonicalBrief = z.infer<typeof canonicalBriefSchema>;

/**
 * Wire schema for structured outputs. Differences from CanonicalBrief:
 * - `commands` is an array of {name, command} (records compile to
 *   additionalProperties≠false, which structured outputs reject)
 * - no `.max()` caps (unsupported array constraint — enforced by slicing)
 */
const wireSchema = z.object({
  purpose: z.string(),
  how_it_works: z.string(),
  architecture_notes: z.array(z.object({ note: z.string(), evidence: z.string() })),
  key_modules: z.array(z.object({ path: z.string(), role: z.string() })),
  commands: z.array(z.object({ name: z.string(), command: z.string() })),
  conventions: z.array(z.object({ rule: z.string(), evidence: z.string() })),
  structure_highlights: z.array(
    z.object({ path: z.string(), description: z.string() }),
  ),
  setup: z.array(z.string()),
  testing: z.string(),
  gotchas: z.array(z.string()),
});

function wireToBrief(wire: z.infer<typeof wireSchema>): CanonicalBrief {
  const commands: Record<string, string> = {};
  for (const entry of wire.commands) commands[entry.name] = entry.command;
  return {
    purpose: wire.purpose,
    how_it_works: wire.how_it_works,
    architecture_notes: wire.architecture_notes.slice(0, 8),
    key_modules: wire.key_modules.slice(0, 12),
    commands,
    conventions: wire.conventions.slice(0, 10),
    structure_highlights: wire.structure_highlights.slice(0, 12),
    setup: wire.setup.slice(0, 8),
    testing: wire.testing,
    gotchas: wire.gotchas.slice(0, 6),
  };
}

export type BriefOrigin = "generated" | "deterministic";

const SYSTEM_PROMPT = `You write operational briefings for AI coding agents, rendered into AGENTS.md and CLAUDE.md files.

You are given a FACTSHEET extracted deterministically from a repository: metadata, detected technologies with exact versions, scripts, structure tree, README, and SAMPLED SOURCE FILES (real code from the repo, chosen by role).

DEPTH TARGET: the briefing a senior engineer gives a new teammate on day one. An agent reading your output and nothing else should understand what this project does, how the pieces fit, and how to work on it without guessing.

HARD RULES:
(1) Never invent commands, paths, versions, or config values — use FACTSHEET values verbatim. Every path you mention must appear in structureTree, sampledFiles, or scriptsMap.
(2) Every architecture_note and convention MUST cite at least one real file path in its "evidence" field.
(3) Ground "purpose" and "how_it_works" in the README and the sampled source — describe the actual domain behavior you can see (e.g. "parses lockfiles into a dependency map", not "handles data processing"). If you cannot tell what the project does, say what you CAN verify and no more.
(4) key_modules roles must be specific: what the file does, its main exports/responsibilities as visible in the samples — never generic filler like "utility functions" or "main logic".
(5) conventions: only patterns actually visible in the sampled code or configs (naming, error handling, typing, imports, test style). Skip standard language defaults.
(6) structure_highlights descriptions must be non-empty and informative.
(7) No marketing language. No restating the obvious ("this is a JavaScript project").
(8) commands: one entry per useful command; "command" is the exact invocation (from scriptsMap with the right package-manager prefix, or Makefile/justfile targets), "name" is a short label.`;

const RUN_PREFIX: Record<string, string> = {
  pnpm: "pnpm",
  yarn: "yarn",
  npm: "npm run",
  bun: "bun run",
};

/** Facts-only brief — the LLM-free floor (02 §7.2 failure path). */
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

  // First README paragraph is the author's own one-liner — better than
  // nothing when the LLM is unavailable.
  const readmeLead = facts.readmeExcerpt
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^#+\s*/gm, "").trim())
    .find((p) => p.length > 40 && !p.startsWith("!") && !p.startsWith("["));

  return {
    purpose:
      (readmeLead ? `${readmeLead.slice(0, 400)} ` : "") +
      `${facts.repo.owner}/${facts.repo.name}` +
      (facts.repo.primaryLanguage ? ` — ${facts.repo.primaryLanguage}` : "") +
      (frameworks.length
        ? ` project using ${frameworks.map((f) => f.name).join(", ")}.`
        : " repository.") +
      (stackLine ? ` Stack: ${stackLine}.` : ""),
    how_it_works: "",
    architecture_notes: facts.workspaceTopology.slice(0, 8).map((ws) => ({
      note: `Workspace package${ws.name ? ` ${ws.name}` : ""} at ${ws.path}`,
      evidence: `${ws.path}/package.json`,
    })),
    key_modules: facts.sampledFiles.slice(0, 12).map((sample) => ({
      path: sample.path,
      role: sample.role,
    })),
    commands,
    conventions: [],
    structure_highlights: [],
    setup: [],
    testing: "",
    gotchas: facts.largeRepo
      ? ["Large repo — analysis ran in manifest-only mode."]
      : [],
  };
}

function buildUserContent(facts: FactSheet): string {
  const { sampledFiles, ...factsSansSamples } = facts;
  const samples = sampledFiles
    .map(
      (sample) =>
        `--- ${sample.path} (role: ${sample.role}${sample.truncated ? ", truncated" : ""}) ---\n${sample.excerpt}`,
    )
    .join("\n\n");
  return [
    "FACTSHEET",
    JSON.stringify(factsSansSamples),
    "",
    "SAMPLED SOURCE FILES",
    samples || "(none available)",
    "",
    "Produce CanonicalBrief JSON.",
  ].join("\n");
}

export async function generateBrief(
  facts: FactSheet,
): Promise<{ brief: CanonicalBrief; origin: BriefOrigin }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { brief: deterministicBrief(facts), origin: "deterministic" };
  }
  const client = await anthropicClient();
  const userContent = buildUserContent(facts);

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Structured outputs (00 §stack): the API constrains the response to
      // the wire schema — no freeform-JSON parsing to fail.
      const response = await client.messages.parse({
        model: GENERATION_MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        output_config: { format: zodOutputFormat(wireSchema) },
        messages: [{ role: "user", content: userContent }],
      });
      if (response.parsed_output) {
        return { brief: wireToBrief(response.parsed_output), origin: "generated" };
      }
      lastError = `no parsed_output (stop_reason: ${response.stop_reason})`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown";
    }
    console.warn(`[gitbrief] brief attempt ${attempt + 1} failed: ${lastError.slice(0, 300)}`);
  }
  // Second failure → minimal deterministic brief (02 §7.2)
  console.warn("[gitbrief] brief generation fell back to deterministic");
  return { brief: deterministicBrief(facts), origin: "deterministic" };
}
