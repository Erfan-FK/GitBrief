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
  code: z.enum(["not_found", "too_large", "timeout", "internal"]),
  message: z.string(),
});
export type ErrorEvent = z.infer<typeof errorEventSchema>;

export type AnalysisEvent =
  | { type: "repo"; data: RepoEvent }
  | { type: "manifest"; data: ManifestEvent }
  | { type: "tech"; data: TechEvent }
  | { type: "detection_complete"; data: DetectionCompleteEvent }
  | { type: "error"; data: ErrorEvent };
