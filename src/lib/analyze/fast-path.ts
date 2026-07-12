import {
  getHeadSha,
  getLanguages,
  getRawFile,
  getRepoMeta,
  getTree,
  GithubError,
} from "@/lib/github/client";
import { runDetection, findWorkspaces } from "@/lib/detect/engine";
import { selectCandidateFiles, PRESENCE_ONLY } from "@/lib/detect/manifest-select";
import { runDeepPath } from "@/lib/analyze/deep-path";
import {
  scoreEventSchema,
  type AnalysisEvent,
  type BundleFileEvent,
  type RepoEvent,
} from "@/lib/analyze/events";
import type { DetectionResult } from "@/lib/detect/types";
import {
  completeAnalysis,
  createAnalysis,
  failAnalysis,
  getCachedAnalysis,
  getCachedBundle,
  markBriefing,
  saveBundle,
  upsertRepo,
} from "@/lib/analyze/store";

/**
 * Full analysis pipeline: fast path (02 §2, <3s detection) then deep path
 * (02 §5, bundle generation) — one event stream. Cache hit on
 * repo@head_sha replays instantly (<500ms, M4 DoD).
 */
export async function* runFastPath(
  owner: string,
  repo: string,
): AsyncGenerator<AnalysisEvent> {
  let analysisId: string | null = null;
  const startedAt = Date.now();
  try {
    // 1. meta + head sha
    const meta = await getRepoMeta(owner, repo);
    const sha = await getHeadSha(owner, repo, meta.default_branch);

    const repoEvent: RepoEvent = {
      owner: meta.owner.login,
      repo: meta.name,
      avatarUrl: meta.owner.avatar_url,
      stars: meta.stargazers_count,
      language: meta.language,
      defaultBranch: meta.default_branch,
      commitSha: sha,
    };
    yield { type: "repo", data: repoEvent };

    // Cache check (repo@head_sha) — replay everything from DB
    const repoId = await upsertRepo(meta);
    if (repoId) {
      const cached = await getCachedAnalysis(repoId, sha);
      if (cached?.status === "complete" && cached.detection_json) {
        const replayed = yield* replayCached(cached.id, cached);
        if (replayed) return;
      }
      if (!cached) analysisId = await createAnalysis(repoId, sha);
      else if (cached.status !== "complete") analysisId = cached.id;
    }

    // 2. one recursive tree call
    const tree = await getTree(owner, repo, sha);
    const largeRepo = tree.truncated;
    const treePaths = tree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path);

    // 3. candidate selection + two-phase fetch
    const phase1 = selectCandidateFiles(treePaths);
    const files = new Map<string, string>();
    const fetchInto = async (path: string): Promise<void> => {
      if (PRESENCE_ONLY.has(path)) return;
      const content = await getRawFile(owner, repo, sha, path);
      if (content !== null) {
        files.set(
          path,
          path === "README.md"
            ? content.split("\n").slice(0, 400).join("\n")
            : content,
        );
      }
    };

    await Promise.allSettled(phase1.map(fetchInto));
    for (const path of phase1) {
      if (files.has(path) || PRESENCE_ONLY.has(path)) {
        yield { type: "manifest", data: { path } };
      }
    }

    const workspaces = findWorkspaces({ treePaths, files, languages: {}, largeRepo });
    const phase2 = selectCandidateFiles(
      treePaths,
      workspaces.map((workspace) => workspace.path),
    ).filter((path) => !files.has(path) && !phase1.includes(path));
    if (phase2.length > 0) {
      await Promise.allSettled(phase2.map(fetchInto));
      for (const path of phase2) {
        if (files.has(path)) yield { type: "manifest", data: { path } };
      }
    }

    // 5. languages
    const languages = await getLanguages(owner, repo).catch(() => ({}));

    // 4+6. detect + stream
    const detection: DetectionResult = runDetection({
      treePaths,
      files,
      languages,
      largeRepo,
    });
    for (const tech of detection.techs) {
      yield { type: "tech", data: toTechEvent(tech) };
    }
    if (analysisId) await markBriefing(analysisId, detection);

    yield {
      type: "detection_complete",
      data: {
        techCount: detection.techs.length,
        manifestCount: detection.manifestsRead.length,
        durationMs: detection.durationMs,
        isMonorepo: detection.isMonorepo,
        largeRepo,
        cached: false,
      },
    };

    // Deep path — bundle generation (M4)
    const deep = runDeepPath(repoEvent, detection, treePaths, files);
    let deepResult: { files: BundleFileEvent[]; score: unknown } | undefined;
    while (true) {
      const { value, done } = await deep.next();
      if (done) {
        deepResult = value;
        break;
      }
      yield value;
    }

    if (analysisId && deepResult) {
      await saveBundle(
        analysisId,
        deepResult.files.map((file) => ({
          path: file.path,
          status: file.status,
          sortOrder: file.sortOrder,
          ...(file.content !== undefined ? { content: file.content } : {}),
          ...(file.origin ? { origin: file.origin } : {}),
          ...(file.skipReason ? { skipReason: file.skipReason } : {}),
          ...(file.provenance ? { provenance: file.provenance } : {}),
        })),
      );
      await completeAnalysis(analysisId, deepResult.score, Date.now() - startedAt);
    }
  } catch (error) {
    if (analysisId) {
      await failAnalysis(
        analysisId,
        error instanceof GithubError && error.status === 404
          ? "not_found"
          : "internal",
      );
    }
    if (error instanceof GithubError && error.status === 404) {
      yield {
        type: "error",
        data: { code: "not_found", message: "Repository not found." },
      };
      return;
    }
    yield {
      type: "error",
      data: { code: "internal", message: "Analysis failed — try again shortly." },
    };
  }
}

/** Replay a fully cached analysis (detection + bundle + score) from the DB. */
async function* replayCached(
  analysisId: string,
  cached: {
    detection_json: DetectionResult | null;
    score_json: unknown;
    duration_detect_ms: number | null;
  },
): AsyncGenerator<AnalysisEvent, boolean> {
  const detection = cached.detection_json;
  if (!detection) return false;
  const bundleFiles = await getCachedBundle(analysisId);

  for (const manifest of detection.manifestsRead) {
    yield { type: "manifest", data: { path: manifest } };
  }
  for (const tech of detection.techs) {
    yield { type: "tech", data: toTechEvent(tech) };
  }
  yield {
    type: "detection_complete",
    data: {
      techCount: detection.techs.length,
      manifestCount: detection.manifestsRead.length,
      durationMs: cached.duration_detect_ms ?? detection.durationMs,
      isMonorepo: detection.isMonorepo,
      largeRepo: detection.largeRepo,
      cached: true,
    },
  };

  if (!bundleFiles || bundleFiles.length === 0) return false;

  for (const file of bundleFiles) {
    yield {
      type: "file",
      data: {
        path: file.path,
        status: file.status as "complete" | "skipped",
        sortOrder: file.sort_order ?? 50,
        ...(file.content !== null ? { content: file.content } : {}),
        ...(file.origin
          ? { origin: file.origin as "official" | "generated" | "generated-cached" | "deterministic" }
          : {}),
        ...(file.skip_reason ? { skipReason: file.skip_reason } : {}),
        ...(file.provenance_json
          ? {
              provenance: file.provenance_json as {
                sources: { url: string; kind: string }[];
                fetchedAt: string;
              },
            }
          : {}),
      },
    };
  }

  const score = scoreEventSchema.safeParse(cached.score_json);
  if (score.success) yield { type: "score", data: score.data };

  yield {
    type: "analysis_complete",
    data: {
      fileCount: bundleFiles.filter((f) => f.status === "complete").length,
      skippedCount: bundleFiles.filter((f) => f.status === "skipped").length,
      totalDurationMs: 0,
      verifiedCommands: 0,
      strippedClaims: 0,
    },
  };
  return true;
}

function toTechEvent(tech: DetectionResult["techs"][number]) {
  return {
    slug: tech.slug,
    name: tech.name,
    category: tech.category,
    packagePaths: tech.packagePaths,
    ...(tech.iconRef ? { iconRef: tech.iconRef } : {}),
    ...(tech.version ? { version: tech.version } : {}),
    ...(tech.versionConfidence
      ? { versionConfidence: tech.versionConfidence }
      : {}),
    ...(tech.variant ? { variant: tech.variant } : {}),
  };
}
