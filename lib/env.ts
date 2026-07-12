/** Centralised environment access. Nothing else reads process.env directly. */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  /** Server-side only. Bypasses RLS; reserved for future admin features. */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  /** Which wedding this deployment serves. */
  weddingSlug: process.env.WEDDING_SLUG ?? "hazel-and-jhonel",
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
