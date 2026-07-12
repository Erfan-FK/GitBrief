import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Anon read-only client — RLS allows SELECT on public tables (03 §2). */
let cached: SupabaseClient | null | undefined;

export function getAnonClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return cached;
}

export interface GalleryRow {
  owner: string;
  name: string;
  avatar_url: string | null;
  score: number;
  techSlugs: string[];
}

/** Latest complete analyses joined to repos — gallery + sitemap source. */
export async function getAnalyzedRepos(limit = 8): Promise<GalleryRow[]> {
  const db = getAnonClient();
  if (!db) return [];
  const { data } = await db
    .from("analyses")
    .select(
      "score_json,detection_json,created_at,repos!inner(owner,name,avatar_url)",
    )
    .eq("status", "complete")
    .not("score_json", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  if (!data) return [];

  const seen = new Set<string>();
  const rows: GalleryRow[] = [];
  for (const row of data as unknown as {
    score_json: { total?: number } | null;
    detection_json: { techs?: { slug: string; iconRef?: string }[] } | null;
    repos: { owner: string; name: string; avatar_url: string | null };
  }[]) {
    const key = `${row.repos.owner}/${row.repos.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      owner: row.repos.owner,
      name: row.repos.name,
      avatar_url: row.repos.avatar_url,
      score: row.score_json?.total ?? 0,
      techSlugs: (row.detection_json?.techs ?? [])
        .map((tech) => tech.iconRef ?? tech.slug)
        .slice(0, 5),
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

export interface OgData {
  owner: string;
  name: string;
  avatarUrl: string | null;
  score: number | null;
  items: { pass: boolean; label: string }[];
}

export async function getOgData(
  owner: string,
  repo: string,
): Promise<OgData | null> {
  const db = getAnonClient();
  if (!db) return null;
  const { data: repoRow } = await db
    .from("repos")
    .select("id,owner,name,avatar_url")
    .eq("owner", owner)
    .eq("name", repo)
    .maybeSingle();
  if (!repoRow) return null;
  const { data: analysis } = await db
    .from("analyses")
    .select("score_json")
    .eq("repo_id", repoRow.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const score = analysis?.score_json as
    | { total?: number; items?: { pass: boolean; label: string }[] }
    | null;
  return {
    owner: repoRow.owner,
    name: repoRow.name,
    avatarUrl: repoRow.avatar_url,
    score: score?.total ?? null,
    items: (score?.items ?? []).slice(0, 4),
  };
}
