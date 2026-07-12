import { analysisRequested, inngest } from "@/inngest/client";
import { runFastPath } from "@/lib/analyze/fast-path";

/**
 * Inngest `analysis/run` — 02 §5. The SSE route runs the same pipeline
 * inline for interactive requests; this function covers background
 * re-analysis (gallery refresh, seed script) with retries. Results persist
 * via the shared store; clients pick them up from the analyses cache.
 */
export const analysisRun = inngest.createFunction(
  {
    id: "analysis-run",
    retries: 2,
    concurrency: { limit: 10 },
    triggers: [analysisRequested],
  },
  async ({ event, step }) => {
    const { owner, repo } = event.data;
    return step.run("run-pipeline", async () => {
      let fileCount = 0;
      let errorCode: string | null = null;
      for await (const analysisEvent of runFastPath(owner, repo)) {
        if (analysisEvent.type === "file") fileCount++;
        if (analysisEvent.type === "error") errorCode = analysisEvent.data.code;
      }
      if (errorCode) throw new Error(`analysis failed: ${errorCode}`);
      return { owner, repo, fileCount };
    });
  },
);
