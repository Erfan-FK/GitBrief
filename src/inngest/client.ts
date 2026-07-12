import { Inngest, eventType } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({ id: "gitbrief" });

export const analysisRequested = eventType("analysis/requested", {
  schema: z.object({
    owner: z.string(),
    repo: z.string(),
  }),
});
