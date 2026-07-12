import type { Metadata } from "next";
import { DetectionPanel } from "@/components/results/detection-panel";

/** Results route — Phase 1 (detection) per 01 §19. Phase 2 lands in M4. */

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
    <div className="flex min-h-[100svh] flex-col pt-28 pb-24">
      <DetectionPanel owner={owner} repo={repo} />
    </div>
  );
}
