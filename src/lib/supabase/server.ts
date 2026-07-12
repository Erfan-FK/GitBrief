import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side writes (03 §2: all writes via service
 * role). Returns null when the key isn't configured — callers degrade to
 * stateless operation so local dev works before secrets are set.
 */
let cached: SupabaseClient | null | undefined;

export function getServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}
