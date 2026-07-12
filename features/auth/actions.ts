"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";

export type LoginState = { error: string } | { error: null };
export type EmailFlowState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; error: string };

/** Origin for auth email redirects, derived from the current request. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password don't match our records." };
  }

  redirect("/dashboard");
}

/** Send a one-time sign-in link. Never creates accounts, and answers
 * identically whether or not the email is registered (no enumeration). */
export async function requestMagicLink(
  _prev: EmailFlowState,
  formData: FormData,
): Promise<EmailFlowState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "error", error: "Please enter your email." };

  const origin = await requestOrigin();
  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });

  // "Signups not allowed" means the email isn't registered — same reply.
  if (error && !/signup/i.test(error.message)) {
    return {
      status: "error",
      error: /rate limit/i.test(error.message)
        ? "Too many emails sent just now — please wait a few minutes and try again."
        : "Couldn't send the link. Please try again.",
    };
  }
  return { status: "sent" };
}

/** Send a password-reset link that lands on the change-password page. */
export async function requestPasswordReset(
  _prev: EmailFlowState,
  formData: FormData,
): Promise<EmailFlowState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "error", error: "Please enter your email." };

  const origin = await requestOrigin();
  const supabase = await getSupabaseAuthClient();
  // Succeeds regardless of whether the email exists (no enumeration).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/dashboard/settings/password`,
  });
  if (error && /rate limit/i.test(error.message)) {
    return {
      status: "error",
      error: "Too many emails sent just now — please wait a few minutes and try again.",
    };
  }
  return { status: "sent" };
}

export type ChangePasswordState =
  | { status: "idle" }
  | { status: "done" }
  | { status: "error"; error: string };

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { status: "error", error: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { status: "error", error: "The passwords don't match." };
  }

  const supabase = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Your session has expired — sign in again." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      status: "error",
      error: /different from the old/i.test(error.message)
        ? "The new password must be different from the current one."
        : error.message,
    };
  }
  return { status: "done" };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
