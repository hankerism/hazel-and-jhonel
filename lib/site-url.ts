import { headers } from "next/headers";
import { env } from "@/lib/env";

/** Public base URL for links in emails and calendar files. Prefers
 * NEXT_PUBLIC_SITE_URL; falls back to the current request's origin. */
export async function getSiteUrl(): Promise<string> {
  if (env.siteUrl) return env.siteUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
