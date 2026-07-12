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
    .select("id,status,detection_json,duration_detect_ms,created_at")
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

export async function completeDetection(
  analysisId: string,
  detection: DetectionResult,
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  await db
    .from("analyses")
    .update({
      // M3 fast path ends at detection; M4 moves this to 'briefing'.
      status: "complete",
      detection_json: detection,
      duration_detect_ms: detection.durationMs,
    })
    .eq("id", analysisId);
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
