/**
 * Model ids — single source of truth (CLAUDE.md rule: model ids from here
 * only). 00 §stack: Sonnet for generation, Haiku for classification.
 * claude-sonnet-5 (current Sonnet) — required for structured outputs
 * (output_config.format); it rejects non-default sampling params, so no
 * temperature is set (see DECISIONS.md).
 */
export const GENERATION_MODEL = "claude-sonnet-5";
export const CLASSIFIER_MODEL = "claude-haiku-4-5";

import Anthropic from "@anthropic-ai/sdk";

let proxyOptions: unknown;

/**
 * Shared Anthropic client. Node's fetch ignores HTTP(S)_PROXY env vars, so on
 * dev machines behind a local proxy/VPN we hand the SDK undici's own fetch
 * plus an EnvHttpProxyAgent dispatcher (fetch and dispatcher must come from
 * the SAME undici build — Next's patched global fetch rejects a foreign
 * dispatcher). No-op in environments without proxy env vars.
 */
export async function anthropicClient(): Promise<Anthropic> {
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    if (!proxyOptions) {
      const undici = await import("undici");
      proxyOptions = {
        fetch: undici.fetch,
        fetchOptions: { dispatcher: new undici.EnvHttpProxyAgent() },
      };
    }
    return new Anthropic(
      proxyOptions as ConstructorParameters<typeof Anthropic>[0],
    );
  }
  return new Anthropic();
}
