import { runFastPath } from "@/lib/analyze/fast-path";

export const dynamic = "force-dynamic";

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        for await (const event of runFastPath(owner, repo)) {
          send(event.type, event.data);
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
