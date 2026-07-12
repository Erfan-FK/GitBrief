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
import type { AnalysisEvent } from "@/lib/analyze/events";
import type { DetectionResult } from "@/lib/detect/types";
import {
  completeDetection,
  createAnalysis,
  failAnalysis,
  getCachedAnalysis,
  upsertRepo,
} from "@/lib/analyze/store";

/**
 * Fast path — 02 §2, synchronous, target <3s p50.
 * Async generator: yields SSE events in order; caller streams them.
 */
export async function* runFastPath(
  owner: string,
  repo: string,
): AsyncGenerator<AnalysisEvent> {
  let analysisId: string | null = null;
  try {
    // 1. meta + head sha
    const meta = await getRepoMeta(owner, repo);
    const sha = await getHeadSha(owner, repo, meta.default_branch);

    yield {
      type: "repo",
      data: {
        owner: meta.owner.login,
        repo: meta.name,
        avatarUrl: meta.owner.avatar_url,
        stars: meta.stargazers_count,
        language: meta.language,
        defaultBranch: meta.default_branch,
        commitSha: sha,
      },
    };

    // Cache check (repo@head_sha) — 01 §18
    const repoId = await upsertRepo(meta);
    if (repoId) {
      const cached = await getCachedAnalysis(repoId, sha);
      if (cached?.status === "complete" && cached.detection_json) {
        const detection = cached.detection_json;
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
        return;
      }
      analysisId = await createAnalysis(repoId, sha);
    }

    // 2. one recursive tree call
    const tree = await getTree(owner, repo, sha);
    const largeRepo = tree.truncated;
    const treePaths = tree.tree
      .filter((e) => e.type === "blob")
      .map((e) => e.path);

    // 3. candidate selection — needs workspace pkg paths, which need the
    // root manifests: two-phase fetch.
    const phase1 = selectCandidateFiles(treePaths);
    const files = new Map<string, string>();

    const fetchInto = async (path: string): Promise<string | null> => {
      if (PRESENCE_ONLY.has(path)) return "";
      const content = await getRawFile(owner, repo, sha, path);
      if (content !== null) {
        files.set(
          path,
          path === "README.md"
            ? content.split("\n").slice(0, 400).join("\n")
            : content,
        );
      }
      return content;
    };

    const results = await Promise.allSettled(phase1.map(fetchInto));
    void results;
    for (const path of phase1) {
      if (files.has(path) || PRESENCE_ONLY.has(path)) {
        yield { type: "manifest", data: { path } };
      }
    }

    // Workspace package.json second wave (cap shared with phase 1)
    const workspaces = findWorkspaces({
      treePaths,
      files,
      languages: {},
      largeRepo,
    });
    const phase2 = selectCandidateFiles(
      treePaths,
      workspaces.map((w) => w.path),
    ).filter((p) => !files.has(p) && !phase1.includes(p));
    if (phase2.length > 0) {
      await Promise.allSettled(phase2.map(fetchInto));
      for (const path of phase2) {
        if (files.has(path)) yield { type: "manifest", data: { path } };
      }
    }

    // 5. languages
    const languages = await getLanguages(owner, repo).catch(() => ({}));

    // 4+6. detect, stream, persist
    const detection: DetectionResult = runDetection({
      treePaths,
      files,
      languages,
      largeRepo,
    });

    for (const tech of detection.techs) {
      yield { type: "tech", data: toTechEvent(tech) };
    }
    if (analysisId) await completeDetection(analysisId, detection);

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
      data: {
        code: "internal",
        message: "Analysis failed — try again shortly.",
      },
    };
  }
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
