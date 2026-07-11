import { NextResponse } from "next/server";
import {
  githubRepoMetaSchema,
  resolveRequestSchema,
  type Problem,
  type ResolveResponse,
} from "@/lib/contracts";
import { resolveRepoInput } from "@/lib/github/resolve-input";

function problem(status: number, title: string, detail: string) {
  const body: Problem = { type: "about:blank", title, status, detail };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = resolveRequestSchema.safeParse(await request.json());
  } catch {
    return problem(400, "Invalid JSON", "Request body must be JSON.");
  }
  if (!parsed.success) {
    return problem(422, "Invalid input", "Provide { input: string }.");
  }

  const resolved = resolveRepoInput(parsed.data.input);
  if (!resolved) {
    return problem(
      422,
      "Unrecognized repository reference",
      "Repo not found — check the URL or try owner/repo",
    );
  }

  // Existence check. Unauthenticated for now; GitHub App token lands in M3
  // (see DECISIONS.md). 404 covers both missing and private repos.
  const res = await fetch(
    `https://api.github.com/repos/${resolved.owner}/${resolved.repo}`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 600 },
    },
  );

  if (res.status === 404) {
    return problem(
      404,
      "Repository not found",
      "Repo not found — check the URL or try owner/repo",
    );
  }
  if (!res.ok) {
    return problem(
      502,
      "GitHub unavailable",
      "Could not reach GitHub — try again shortly.",
    );
  }

  const meta = githubRepoMetaSchema.safeParse(await res.json());
  if (!meta.success) {
    return problem(502, "GitHub unavailable", "Unexpected GitHub response.");
  }

  const body: ResolveResponse = {
    owner: meta.data.owner.login,
    repo: meta.data.name,
    avatarUrl: meta.data.owner.avatar_url,
    private: meta.data.private,
    ...(resolved.branch ? { branch: resolved.branch } : {}),
  };
  return NextResponse.json(body);
}
