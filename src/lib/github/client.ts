import { z } from "zod";
import { githubRepoMetaSchema, type GithubRepoMeta } from "@/lib/contracts";

/**
 * GitHub REST client — 02 §2. Uses GITHUB_TOKEN when present (App
 * installation token lands later; see DECISIONS.md), anonymous otherwise.
 */

const API = "https://api.github.com";

export class GithubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function ghJson(path: string, revalidate: number): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(),
    next: { revalidate },
  });
  if (!res.ok) {
    throw new GithubError(res.status, `GitHub ${res.status} for ${path}`);
  }
  return res.json();
}

export async function getRepoMeta(
  owner: string,
  repo: string,
): Promise<GithubRepoMeta> {
  const data = await ghJson(`/repos/${owner}/${repo}`, 600);
  return githubRepoMetaSchema.parse(data);
}

const branchSchema = z.object({
  commit: z.object({ sha: z.string() }),
});

export async function getHeadSha(
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const data = await ghJson(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    300,
  );
  return branchSchema.parse(data).commit.sha;
}

const treeSchema = z.object({
  truncated: z.boolean(),
  tree: z.array(
    z.object({
      path: z.string(),
      type: z.enum(["blob", "tree", "commit"]),
      size: z.number().optional(),
    }),
  ),
});
export type GitTree = z.infer<typeof treeSchema>;

/** One recursive tree call — truncated:true → largeRepo manifest-only mode. */
export async function getTree(
  owner: string,
  repo: string,
  sha: string,
): Promise<GitTree> {
  const data = await ghJson(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    86400,
  );
  return treeSchema.parse(data);
}

const languagesSchema = z.record(z.string(), z.number());

export async function getLanguages(
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  const data = await ghJson(`/repos/${owner}/${repo}/languages`, 86400);
  return languagesSchema.parse(data);
}

/**
 * Blob contents via raw.githubusercontent (no API rate-limit cost).
 * Returns null for missing/oversized files — detection degrades per-file.
 */
export async function getRawFile(
  owner: string,
  repo: string,
  sha: string,
  path: string,
  maxBytes = 2 * 1024 * 1024,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > maxBytes ? null : text;
  } catch {
    return null;
  }
}
