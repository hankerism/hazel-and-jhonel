"use server";

import { updateRow, revalidateSite, type ActionResult } from "@/lib/dashboard/crud";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";
import { sendEmail } from "@/services/email/mailer";
import { renderConfirmationEmail } from "@/services/email/templates/confirmation";
import { getWeddingContent } from "@/services/wedding-service";

export interface MusicSettingsInput {
  musicUrl: string;
  musicAutoplay: boolean;
}

export async function updateMusicSettings(
  weddingId: string,
  input: MusicSettingsInput,
): Promise<ActionResult> {
  const url = input.musicUrl.trim();
  if (!/^(https?:\/\/|\/)/.test(url)) {
    return { ok: false, error: "Music URL must start with https://… or /." };
  }
  const result = await updateRow("weddings", weddingId, {
    music_url: url,
    music_autoplay: input.musicAutoplay,
  });
  if (result.ok) revalidateSite("/dashboard/settings");
  return result;
}

export type TestEmailResult =
  | { ok: true; to: string; messageId: string }
  | { ok: false; error: string };

/** Send the exact production confirmation template to the signed-in user. */
export async function sendTestEmail(): Promise<TestEmailResult> {
  const supabase = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Your session has expired — sign in again." };
  }

  const { wedding } = await getWeddingContent();
  const rendered = renderConfirmationEmail({
    wedding,
    guest: {
      firstName: "Test",
      lastName: "Guest",
      guestCount: 2,
      mealPreference: "Chicken",
      plusOneName: "Plus One Example",
    },
    websiteUrl: await getSiteUrl(),
  });

  // Unique subject per test: identical subjects make Gmail thread test
  // emails into one conversation, which mixes old and new sends.
  const stamp = new Date().toISOString().slice(11, 19);
  const result = await sendEmail({
    to: user.email,
    ...rendered,
    subject: `[Test ${stamp}] ${rendered.subject}`,
  });

  return result.ok
    ? { ok: true, to: user.email, messageId: result.messageId }
    : result;
}
