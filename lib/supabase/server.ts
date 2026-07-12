import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the public anon key — RLS policies are
 * the security boundary. Returns null when Supabase is not configured so
 * callers can degrade with a clear message.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  anonClient ??= createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}

/**
 * Service-role client — BYPASSES Row Level Security.
 *
 * Server-side only, and only for trusted admin operations (the future
 * /admin dashboard). Never call from anything reachable by guests, and
 * never let its data cross into Client Component props unchecked.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  adminClient ??= createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
