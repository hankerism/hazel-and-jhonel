import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";

/**
 * Lands Supabase auth email links (magic link, password recovery) and turns
 * them into a cookie session. Supports both link styles:
 *   ?token_hash=…&type=…   (customized email templates / generated links)
 *   ?code=…                (default templates via the PKCE flow)
 * Then redirects to `next` (sanitized to same-origin paths).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/dashboard";

  const redirectTo = (path: string) => {
    // `path` may carry a query string — resolve against the request origin.
    const url = new URL(path, request.nextUrl.origin);
    return NextResponse.redirect(url);
  };

  const supabase = await getSupabaseAuthClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) return redirectTo(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(next);
  }

  return redirectTo("/login?link=invalid");
}
