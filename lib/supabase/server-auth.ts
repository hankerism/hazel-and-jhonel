import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cookie-session Supabase client for the dashboard: Server Components,
 * Server Actions, and Route Handlers. Runs as the signed-in couple, so RLS
 * "authenticated" policies apply. Create per-request — never cache.
 */
export async function getSupabaseAuthClient(): Promise<SupabaseClient> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (read-only cookies): safe to
          // ignore — the proxy refreshes sessions before we get here.
        }
      },
    },
  });
}
