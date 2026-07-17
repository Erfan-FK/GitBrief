import * as Sentry from "@sentry/nextjs";

export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Node's fetch (undici) ignores HTTP(S)_PROXY env vars. On dev machines
    // behind a local proxy/VPN, outbound API calls (Anthropic, GitHub,
    // Context7) fail without this. No-op when no proxy env is set.
    if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
      const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
      setGlobalDispatcher(new EnvHttpProxyAgent());
    }
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
