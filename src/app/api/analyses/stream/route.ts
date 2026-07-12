import { runFastPath } from "@/lib/analyze/fast-path";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Per-job wall-clock budget — 02 §11. */
const JOB_BUDGET_MS = 120_000;

/**
 * SSE fast-path stream. M3 addresses analyses by owner/repo query params
 * (the id-based route per 02 §1 arrives with the M4 job pipeline); events
 * match the spec: repo, manifest, tech, detection_complete, error.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner");
  const repo = url.searchParams.get("repo");
  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    return new Response("owner and repo query params required", { status: 422 });
  }

  const ip = clientIp(request);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      const deadline = Date.now() + JOB_BUDGET_MS;
      try {
        const rateGate = () => checkRateLimit(ip);
        for await (const event of runFastPath(owner, repo, rateGate)) {
          send(event.type, event.data);
          if (Date.now() > deadline) {
            send("error", {
              code: "timeout",
              message: "Analysis exceeded the time budget — try again.",
            });
            break;
          }
        }
      } catch {
        send("error", { code: "internal", message: "Stream failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
