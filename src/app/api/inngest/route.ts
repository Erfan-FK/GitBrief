import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { analysisRun } from "@/inngest/analysis-run";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analysisRun],
});
