import { buildFactSheet } from "@/lib/generate/factsheet";
import { collectSamples } from "@/lib/generate/sample";
import { generateBrief } from "@/lib/generate/brief";
import {
  writeAgentsMd,
  writeClaudeMd,
  writeCursorRules,
  writeIgnore,
  writeMcpJson,
} from "@/lib/generate/writers";
import { validateFile } from "@/lib/validate";
import { resolveSkills } from "@/lib/resolve/skills";
import { computeScore } from "@/lib/score";
import { TECH_BY_SLUG } from "@/lib/detect/registry";
import type { DetectionResult } from "@/lib/detect/types";
import type {
  AnalysisEvent,
  BundleFileEvent,
  RepoEvent,
  ScoreEvent,
} from "@/lib/analyze/events";

/**
 * Deep path — 02 §5 step chain as a pure async generator over already-
 * fetched data. Invoked inline after the fast path (and by the Inngest
 * function when configured). Tarball + stack-analyser step stubbed —
 * see DECISIONS.md.
 */

/** Sidebar order — 01 §20. */
function sortOrderFor(path: string): number {
  if (path === "AGENTS.md") return 0;
  if (path === "CLAUDE.md") return 1;
  if (path.startsWith(".cursor/rules/")) return 2;
  if (path.startsWith(".claude/skills/")) return 10; // alpha within
  if (path === ".mcp.json") return 90;
  if (path === ".cursorignore") return 91;
  return 50;
}

export interface DeepPathResult {
  files: BundleFileEvent[];
  score: ScoreEvent;
}

export async function* runDeepPath(
  repo: RepoEvent,
  detection: DetectionResult,
  treePaths: string[],
  files: Map<string, string>,
  fetchFile: (path: string) => Promise<string | null> = async () => null,
): AsyncGenerator<AnalysisEvent, DeepPathResult> {
  const started = Date.now();
  // Sample real source files (secret-scrubbed, prompt-only — 02 §11) so the
  // generator can describe what the code actually does.
  const sampledFiles = await collectSamples(treePaths, files, fetchFile);
  const facts = buildFactSheet(repo, detection, treePaths, files, sampledFiles);

  // Vendor homepages are allowed link targets in generated docs (02 §8)
  const vendorDomains = detection.techs
    .map((tech) => TECH_BY_SLUG.get(tech.slug)?.homepage)
    .filter((h): h is string => Boolean(h))
    .map((h) => new URL(h).hostname.replace(/^www\./, ""));

  const emitted: BundleFileEvent[] = [];
  let verifiedTotal = 0;
  let strippedTotal = 0;

  const emitFile = (
    path: string,
    content: string,
    origin: BundleFileEvent["origin"],
    provenance: NonNullable<BundleFileEvent["provenance"]>,
  ): BundleFileEvent => {
    const event: BundleFileEvent = {
      path,
      status: "complete",
      origin,
      content,
      provenance,
      sortOrder: sortOrderFor(path),
    };
    emitted.push(event);
    return event;
  };

  // 1. Brief → project files, each through the validator gate
  const { brief, origin: briefOrigin } = await generateBrief(facts);
  const now = () => new Date().toISOString();
  const projectFiles: { path: string; raw: string }[] = [
    { path: "AGENTS.md", raw: writeAgentsMd(brief, facts) },
    { path: "CLAUDE.md", raw: writeClaudeMd(brief, facts) },
    { path: ".cursor/rules/gitbrief.mdc", raw: writeCursorRules(brief, facts) },
  ];

  for (const { path, raw } of projectFiles) {
    const validated = validateFile(raw, facts, treePaths, vendorDomains);
    verifiedTotal += validated.verifiedCommands;
    strippedTotal += validated.strippedClaims;
    yield {
      type: "file",
      data: emitFile(
        path,
        validated.content,
        briefOrigin === "generated" ? "generated" : "deterministic",
        {
          sources: [],
          fetchedAt: now(),
          verifiedCommands: validated.verifiedCommands,
          strippedClaims: validated.strippedClaims,
        },
      ),
    };
  }

  // 2. Skills — per-tech, failures degrade to skipped rows (02 §5)
  const skills = await resolveSkills(detection.techs);
  skills.sort((a, b) => a.path.localeCompare(b.path));
  for (const skill of skills) {
    if (skill.status === "complete" && skill.content) {
      verifiedTotal += 0;
      yield {
        type: "file",
        data: emitFile(skill.path, skill.content, skill.origin ?? "generated", {
          sources: skill.provenance.sources,
          fetchedAt: skill.provenance.fetchedAt,
        }),
      };
    } else {
      const event: BundleFileEvent = {
        path: skill.path,
        status: "skipped",
        skipReason: skill.skipReason ?? "unknown",
        sortOrder: sortOrderFor(skill.path),
        provenance: {
          sources: skill.provenance.sources,
          fetchedAt: skill.provenance.fetchedAt,
        },
      };
      emitted.push(event);
      yield { type: "file", data: event };
    }
  }

  // 3. Deterministic extras
  const mcpJson = writeMcpJson(detection);
  if (mcpJson) {
    yield {
      type: "file",
      data: emitFile(".mcp.json", mcpJson, "deterministic", {
        sources: [],
        fetchedAt: now(),
      }),
    };
  }
  const ignore = writeIgnore(treePaths);
  if (ignore) {
    yield {
      type: "file",
      data: emitFile(".cursorignore", ignore, "deterministic", {
        sources: [],
        fetchedAt: now(),
      }),
    };
  }

  // 4. Score
  const score = computeScore(facts, treePaths);
  yield { type: "score", data: score };

  yield {
    type: "analysis_complete",
    data: {
      fileCount: emitted.filter((f) => f.status === "complete").length,
      skippedCount: emitted.filter((f) => f.status === "skipped").length,
      totalDurationMs: Date.now() - started,
      verifiedCommands: verifiedTotal,
      strippedClaims: strippedTotal,
    },
  };

  return { files: emitted, score };
}
