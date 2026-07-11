import { z } from "zod";

/** RFC 7807 problem shape — 02 §1. */
export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
});
export type Problem = z.infer<typeof problemSchema>;

export const resolveRequestSchema = z.object({
  input: z.string().min(1).max(500),
});
export type ResolveRequest = z.infer<typeof resolveRequestSchema>;

export const resolveResponseSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string().optional(),
  /** Repo meta from the existence check, for the search-bar valid state. */
  avatarUrl: z.string().url().optional(),
  private: z.boolean().optional(),
});
export type ResolveResponse = z.infer<typeof resolveResponseSchema>;

/** GitHub GET /repos/{owner}/{repo} — only the fields we consume. */
export const githubRepoMetaSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  private: z.boolean(),
  stargazers_count: z.number(),
  language: z.string().nullable(),
  owner: z.object({ login: z.string(), avatar_url: z.string() }),
});
export type GithubRepoMeta = z.infer<typeof githubRepoMetaSchema>;
