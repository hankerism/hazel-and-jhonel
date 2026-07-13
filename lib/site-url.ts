import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Canonical public URL of the wedding website, for emails and calendar
 * links. Resolution order:
 *
 *   1. NEXT_PUBLIC_SITE_URL
 *   2. Vercel's VERCEL_PROJECT_PRODUCTION_URL (set automatically in prod)
 *   3. The current request's origin (local development)
 *
 * A candidate pointing at the Supabase project is ALWAYS rejected — the
 * database host must never appear as the wedding website (guards against
 * a mis-pasted environment variable).
 */

function normalize(candidate: string | undefined | null): string | null {
  if (!candidate) return null;
  const withProtocol = /^https?:\/\//.test(candidate)
    ? candidate
    : `https://${candidate}`;
  try {
    const url = new URL(withProtocol);
    if (
      url.hostname.endsWith(".supabase.co") ||
      url.hostname.endsWith(".supabase.in")
    ) {
      console.error(
        `[site-url] Refusing to use a Supabase host as the site URL (${url.hostname}) — check NEXT_PUBLIC_SITE_URL.`,
      );
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export async function getSiteUrl(): Promise<string> {
  const configured =
    normalize(env.siteUrl) ?? normalize(env.vercelProductionUrl);
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return normalize(`${proto}://${host}`) ?? `${proto}://${host}`;
}
