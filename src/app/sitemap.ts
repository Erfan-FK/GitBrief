import type { MetadataRoute } from "next";
import { getAnalyzedRepos } from "@/lib/supabase/anon";

const BASE = "https://gitbrief.dev";

/** Sitemap: landing + analyzed repos (00 M5). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const analyzed = await getAnalyzedRepos(500).catch(() => []);
  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    ...analyzed.map((row) => ({
      url: `${BASE}/${row.owner}/${row.name}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
