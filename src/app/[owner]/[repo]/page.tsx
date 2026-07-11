import type { Metadata } from "next";

/**
 * Results route stub — full detection pipeline + Phase 1/2 UI land in M3/M4
 * (plan/01 Part B). Exists so the M2 search bar has a navigation target.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo} — gitbrief` };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-[760px] flex-col items-center justify-center px-6 pt-16">
      <p className="font-mono text-sm text-muted-foreground">analysis for</p>
      <h1 className="mt-2 font-display text-2xl font-medium">
        {owner}/{repo}
      </h1>
      <p className="mt-6 text-center text-muted-foreground">
        The detection pipeline ships in the next milestone. This page will
        stream detected technologies and your generated bundle.
      </p>
    </div>
  );
}
