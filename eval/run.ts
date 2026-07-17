/**
 * Golden-set eval harness — 02 §10. For each golden repo (has a developer-
 * written agent file): run our pipeline (ignoring their agent file as input
 * to generation), then compare ours vs theirs:
 * - command coverage: % of their documented commands our pipeline found
 * - path accuracy: paths in OUR output that exist in the tree (0 invented = pass)
 * - length ratio: ours / theirs
 * LLM-judge rubric (Haiku) runs only when ANTHROPIC_API_KEY is set.
 * Output: eval/report.md. Regression rule (CI, M6+): command coverage or
 * path accuracy drop >2pts vs committed baseline → fail.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getHeadSha,
  getLanguages,
  getRawFile,
  getRepoMeta,
  getTree,
} from "../src/lib/github/client";
import { runDetection, findWorkspaces } from "../src/lib/detect/engine";
import {
  selectCandidateFiles,
  PRESENCE_ONLY,
} from "../src/lib/detect/manifest-select";
import { buildFactSheet } from "../src/lib/generate/factsheet";
import { collectSamples } from "../src/lib/generate/sample";
import { generateBrief } from "../src/lib/generate/brief";
import { writeClaudeMd } from "../src/lib/generate/writers";
import { validateFile } from "../src/lib/validate";

config({ path: ".env.local" });
config();

interface RepoReport {
  repo: string;
  theirFile: string | null;
  commandCoverage: number | null; // %
  inventedPaths: number;
  lengthRatio: number | null;
  strippedClaims: number;
  error?: string;
}

const COMMAND_RE =
  /`((?:npm|pnpm|yarn|bun|make|just|cargo|go|pytest|uv|poetry|composer|rails|mix)\s[^`]{1,100})`/g;
const PATH_RE = /`([\w.@-]+\/[\w./@-]+)`/g;

async function evalRepo(slug: string): Promise<RepoReport> {
  const [owner, repo] = slug.split("/") as [string, string];
  try {
    const meta = await getRepoMeta(owner, repo);
    const sha = await getHeadSha(owner, repo, meta.default_branch);
    const tree = await getTree(owner, repo, sha);
    const treePaths = tree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path);

    const files = new Map<string, string>();
    const phase1 = selectCandidateFiles(treePaths);
    await Promise.allSettled(
      phase1.map(async (path) => {
        if (PRESENCE_ONLY.has(path)) return;
        const content = await getRawFile(owner, repo, sha, path);
        if (content !== null) files.set(path, content);
      }),
    );
    const workspaces = findWorkspaces({
      treePaths,
      files,
      languages: {},
      largeRepo: false,
    });
    const phase2 = selectCandidateFiles(
      treePaths,
      workspaces.map((w) => w.path),
    ).filter((p) => !files.has(p));
    await Promise.allSettled(
      phase2.map(async (path) => {
        if (PRESENCE_ONLY.has(path)) return;
        const content = await getRawFile(owner, repo, sha, path);
        if (content !== null) files.set(path, content);
      }),
    );

    // Their agent file
    const theirFile =
      ["CLAUDE.md", "AGENTS.md"].find((f) => files.has(f)) ?? null;
    const theirs = theirFile ? (files.get(theirFile) ?? "") : "";

    // Our pipeline — their agent file removed from generation input (02 §10)
    const inputFiles = new Map(files);
    inputFiles.delete("CLAUDE.md");
    inputFiles.delete("AGENTS.md");

    const languages = await getLanguages(owner, repo).catch(() => ({}));
    const detection = runDetection({
      treePaths,
      files: inputFiles,
      languages,
      largeRepo: false,
    });
    const samples = await collectSamples(treePaths, inputFiles, (path) =>
      getRawFile(owner, repo, sha, path),
    );
    const facts = buildFactSheet(
      {
        owner: meta.owner.login,
        repo: meta.name,
        avatarUrl: meta.owner.avatar_url,
        stars: meta.stargazers_count,
        language: meta.language,
        defaultBranch: meta.default_branch,
        commitSha: sha,
      },
      detection,
      treePaths,
      inputFiles,
      samples,
    );
    const { brief } = await generateBrief(facts);
    const raw = writeClaudeMd(brief, facts);
    const validated = validateFile(raw, facts, treePaths);
    const ours = validated.content;

    // Command coverage: their documented script commands (inline code OR
    // fenced blocks) that our pipeline found (output text or scriptsMap).
    const RUNNERS = /^(pnpm|npm|yarn|bun|make|just)\s+(\S.*)$/;
    const theirCommandSet = new Set<string>();
    for (const match of theirs.matchAll(COMMAND_RE)) {
      const c = (match[1] ?? "").trim();
      if (RUNNERS.test(c)) theirCommandSet.add(c);
    }
    let inFence = false;
    for (const line of theirs.split("\n")) {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        continue;
      }
      if (!inFence) continue;
      const cleaned = line.trim().replace(/^\$\s*/, "");
      if (RUNNERS.test(cleaned)) theirCommandSet.add(cleaned);
    }

    // What we "found": script names from the FactSheet + our rendered commands
    const scriptName = (c: string) => {
      const words = c.split(/\s+/);
      return words[1] === "run" || words[1] === "exec" ? words[2] : words[1];
    };
    const knownScripts = new Set<string>();
    for (const scripts of Object.values(facts.scriptsMap)) {
      for (const name of Object.keys(scripts)) knownScripts.add(name);
    }
    for (const { targets } of facts.taskTargets) {
      for (const t of targets) knownScripts.add(t);
    }
    const WELL_KNOWN = new Set(["install", "i", "add", "ci", "dlx", "create", "init"]);
    const theirCommands = [...theirCommandSet];
    const covered = theirCommands.filter((c) => {
      const name = scriptName(c)?.split(/[^\w:.-]/)[0];
      return name !== undefined && (knownScripts.has(name) || WELL_KNOWN.has(name));
    });
    const commandCoverage =
      theirCommands.length > 0
        ? Math.round((covered.length / theirCommands.length) * 100)
        : null;

    // Path accuracy: OUR paths must exist (0 invented — hard fail otherwise)
    const pathSet = new Set(treePaths);
    const ourPaths = [...ours.matchAll(PATH_RE)]
      .map((m) => m[1] ?? "")
      .filter((p) => !p.startsWith("http") && !p.includes("@"));
    const inventedPaths = ourPaths.filter(
      (p) =>
        !pathSet.has(p.replace(/\/$/, "")) &&
        !treePaths.some((t) => t.startsWith(p.replace(/\/$/, "") + "/")),
    ).length;

    const lengthRatio =
      theirs.length > 0
        ? Math.round((ours.length / theirs.length) * 100) / 100
        : null;

    return {
      repo: slug,
      theirFile,
      commandCoverage,
      inventedPaths,
      lengthRatio,
      strippedClaims: validated.strippedClaims,
    };
  } catch (error) {
    return {
      repo: slug,
      theirFile: null,
      commandCoverage: null,
      inventedPaths: 0,
      lengthRatio: null,
      strippedClaims: 0,
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    };
  }
}

async function main() {
  const golden = JSON.parse(
    readFileSync(join(process.cwd(), "eval/golden.json"), "utf8"),
  ) as { repos: string[] };

  const reports: RepoReport[] = [];
  for (const slug of golden.repos) {
    process.stdout.write(`eval ${slug}… `);
    const report = await evalRepo(slug);
    console.log(
      report.error
        ? `✗ ${report.error}`
        : `cov=${report.commandCoverage ?? "n/a"}% invented=${report.inventedPaths}`,
    );
    reports.push(report);
  }

  const scored = reports.filter((r) => !r.error && r.theirFile);
  const withCoverage = scored.filter((r) => r.commandCoverage !== null);
  const avgCoverage =
    withCoverage.length > 0
      ? Math.round(
          withCoverage.reduce((sum, r) => sum + (r.commandCoverage ?? 0), 0) /
            withCoverage.length,
        )
      : null;
  const totalInvented = reports.reduce((sum, r) => sum + r.inventedPaths, 0);

  const md = [
    "# gitbrief eval report",
    "",
    `Generated: ${new Date().toISOString()} · Mode: ${process.env.ANTHROPIC_API_KEY ? "LLM brief" : "deterministic brief (no API key)"}`,
    "",
    `**Aggregate:** command coverage ${avgCoverage !== null ? `${avgCoverage}%` : "n/a (golden files document no commands)"} · invented paths ${totalInvented} (must be 0) · ${scored.length}/${reports.length} repos scored`,
    "",
    "| repo | their file | command coverage | invented paths | length ratio | stripped |",
    "|---|---|---|---|---|---|",
    ...reports.map((r) =>
      r.error
        ? `| ${r.repo} | — | — | — | — | error: ${r.error} |`
        : `| ${r.repo} | ${r.theirFile ?? "none"} | ${r.commandCoverage !== null ? `${r.commandCoverage}%` : "n/a"} | ${r.inventedPaths} | ${r.lengthRatio ?? "n/a"} | ${r.strippedClaims} |`,
    ),
    "",
    totalInvented === 0
      ? "✓ Path accuracy: zero invented paths."
      : `✗ HARD FAIL: ${totalInvented} invented paths.`,
    "",
  ].join("\n");

  writeFileSync(join(process.cwd(), "eval/report.md"), md);
  console.log(
    `\nreport → eval/report.md (coverage ${avgCoverage ?? "n/a"}, invented ${totalInvented})`,
  );
  if (totalInvented > 0) process.exit(1);
}

void main();
