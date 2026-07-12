import { getServiceClient } from "@/lib/supabase/server";
import type { DetectionResult } from "@/lib/detect/types";
import type { GithubRepoMeta } from "@/lib/contracts";

/**
 * Analysis persistence — `analyses` caching per 00 M3. Every function is a
 * no-op returning null when the service-role key is absent (stateless dev).
 */

export interface CachedAnalysis {
  id: string;
  status: string;
  detection_json: DetectionResult | null;
  score_json: unknown;
  duration_detect_ms: number | null;
  created_at: string;
}

export async function upsertRepo(meta: GithubRepoMeta): Promise<string | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data } = await db
    .from("repos")
    .upsert(
      {
        owner: meta.owner.login,
        name: meta.name,
        default_branch: meta.default_branch,
        stars: meta.stargazers_count,
        avatar_url: meta.owner.avatar_url,
        primary_language: meta.language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner,name" },
    )
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function getCachedAnalysis(
  repoId: string,
  commitSha: string,
): Promise<CachedAnalysis | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data } = await db
    .from("analyses")
    .select("id,status,detection_json,score_json,duration_detect_ms,created_at")
    .eq("repo_id", repoId)
    .eq("commit_sha", commitSha)
    .maybeSingle();
  return (data as CachedAnalysis | null) ?? null;
}

export async function createAnalysis(
  repoId: string,
  commitSha: string,
): Promise<string | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data } = await db
    .from("analyses")
    .insert({ repo_id: repoId, commit_sha: commitSha, status: "detecting" })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function markBriefing(
  analysisId: string,
  detection: DetectionResult,
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  await db
    .from("analyses")
    .update({
      status: "briefing",
      detection_json: detection,
      duration_detect_ms: detection.durationMs,
      large_repo_mode: detection.largeRepo,
    })
    .eq("id", analysisId);
}

export async function completeAnalysis(
  analysisId: string,
  score: unknown,
  totalDurationMs: number,
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  await db
    .from("analyses")
    .update({
      status: "complete",
      score_json: score,
      duration_total_ms: totalDurationMs,
    })
    .eq("id", analysisId);
}

export interface StoredBundleFile {
  path: string;
  content: string | null;
  origin: string | null;
  status: string;
  skip_reason: string | null;
  provenance_json: unknown;
  sort_order: number | null;
}

export async function saveBundle(
  analysisId: string,
  files: {
    path: string;
    content?: string;
    origin?: string;
    status: string;
    skipReason?: string;
    provenance?: unknown;
    sortOrder: number;
  }[],
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  const { data: bundle } = await db
    .from("bundles")
    .upsert({ analysis_id: analysisId }, { onConflict: "analysis_id" })
    .select("id")
    .single();
  if (!bundle) return;
  await db.from("bundle_files").upsert(
    files.map((file) => ({
      bundle_id: bundle.id,
      path: file.path,
      content: file.content ?? null,
      origin: file.origin ?? null,
      status: file.status,
      skip_reason: file.skipReason ?? null,
      provenance_json: file.provenance ?? null,
      token_count: file.content ? Math.ceil(file.content.length / 4) : null,
      sort_order: file.sortOrder,
    })),
    { onConflict: "bundle_id,path" },
  );
}

export async function getCachedBundle(
  analysisId: string,
): Promise<StoredBundleFile[] | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data: bundle } = await db
    .from("bundles")
    .select("id")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (!bundle) return null;
  const { data: files } = await db
    .from("bundle_files")
    .select("path,content,origin,status,skip_reason,provenance_json,sort_order")
    .eq("bundle_id", bundle.id)
    .order("sort_order");
  return (files as StoredBundleFile[] | null) ?? null;
}

export async function failAnalysis(
  analysisId: string,
  errorCode: string,
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  await db
    .from("analyses")
    .update({ status: "failed", error_code: errorCode })
    .eq("id", analysisId);
}
