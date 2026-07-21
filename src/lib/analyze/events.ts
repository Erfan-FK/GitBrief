import { z } from "zod";

/** SSE event payloads — 02 §1 `/api/analyses/{id}/stream`. */

export const repoEventSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  avatarUrl: z.string(),
  stars: z.number(),
  language: z.string().nullable(),
  defaultBranch: z.string(),
  commitSha: z.string(),
});
export type RepoEvent = z.infer<typeof repoEventSchema>;

export const manifestEventSchema = z.object({
  path: z.string(),
});
export type ManifestEvent = z.infer<typeof manifestEventSchema>;

export const techEventSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  iconRef: z.string().optional(),
  version: z.string().optional(),
  versionConfidence: z.enum(["exact", "range"]).optional(),
  variant: z.string().optional(),
  packagePaths: z.array(z.string()),
});
export type TechEvent = z.infer<typeof techEventSchema>;

export const detectionCompleteSchema = z.object({
  techCount: z.number(),
  manifestCount: z.number(),
  durationMs: z.number(),
  isMonorepo: z.boolean(),
  largeRepo: z.boolean(),
  cached: z.boolean(),
});
export type DetectionCompleteEvent = z.infer<typeof detectionCompleteSchema>;

export const errorEventSchema = z.object({
  code: z.enum(["not_found", "too_large", "timeout", "internal", "rate_limited"]),
  message: z.string(),
  resetMs: z.number().optional(),
});
export type ErrorEvent = z.infer<typeof errorEventSchema>;

export const bundleFileEventSchema = z.object({
  path: z.string(),
  status: z.enum(["pending", "complete", "skipped"]),
  origin: z
    .enum(["official", "generated", "generated-cached", "deterministic"])
    .optional(),
  content: z.string().optional(),
  skipReason: z.string().optional(),
  provenance: z
    .object({
      sources: z.array(z.object({ url: z.string(), kind: z.string() })),
      fetchedAt: z.string(),
      verifiedCommands: z.number().optional(),
      strippedClaims: z.number().optional(),
    })
    .optional(),
  sortOrder: z.number(),
});
export type BundleFileEvent = z.infer<typeof bundleFileEventSchema>;

export const scoreEventSchema = z.object({
  total: z.number(),
  band: z.enum(["success", "warning", "destructive"]),
  /** Repo classification + 3–4 line summary from the CanonicalBrief. */
  summary: z
    .object({
      kind: z.string(),
      text: z.string(),
    })
    .optional(),
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      pass: z.boolean(),
      points: z.number(),
      maxPoints: z.number(),
      fixHint: z.string(),
    }),
  ),
});
export type ScoreEvent = z.infer<typeof scoreEventSchema>;

export const analysisCompleteSchema = z.object({
  fileCount: z.number(),
  skippedCount: z.number(),
  totalDurationMs: z.number(),
  verifiedCommands: z.number(),
  strippedClaims: z.number(),
});
export type AnalysisCompleteEvent = z.infer<typeof analysisCompleteSchema>;

export type AnalysisEvent =
  | { type: "repo"; data: RepoEvent }
  | { type: "manifest"; data: ManifestEvent }
  | { type: "tech"; data: TechEvent }
  | { type: "detection_complete"; data: DetectionCompleteEvent }
  | { type: "file"; data: BundleFileEvent }
  | { type: "score"; data: ScoreEvent }
  | { type: "analysis_complete"; data: AnalysisCompleteEvent }
  | { type: "error"; data: ErrorEvent };
