import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";
import { getWeddingContent } from "@/services/wedding-service";
import { sendEmail, type SendResult } from "./mailer";
import { renderConfirmationEmail } from "./templates/confirmation";

/**
 * Sends the confirmation email for an RSVP and records the outcome in the
 * rsvps tracking columns. Runs as the signed-in couple (RLS: authenticated
 * update). The caller decides WHETHER to send (once-only rules live in the
 * actions); this module owns HOW.
 */

interface TrackedRsvpRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  guest_count: number;
  meal_preference: string | null;
  plus_one_name: string | null;
  attendance: string;
  confirmation_email_status: string | null;
  confirmation_email_sent_at: string | null;
}

export async function getRsvpEmailTracking(
  rsvpId: string,
): Promise<TrackedRsvpRow | null> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("rsvps")
    .select(
      "id, first_name, last_name, email, guest_count, meal_preference, plus_one_name, attendance, confirmation_email_status, confirmation_email_sent_at",
    )
    .eq("id", rsvpId)
    .single<TrackedRsvpRow>();
  if (error || !data) return null;
  return data;
}

export async function sendRsvpConfirmation(
  rsvpId: string,
  siteUrl: string,
): Promise<SendResult> {
  const row = await getRsvpEmailTracking(rsvpId);
  if (!row) return { ok: false, error: "RSVP not found." };
  if (row.attendance !== "attending") {
    return { ok: false, error: "Confirmation emails are for accepted RSVPs." };
  }

  const { wedding } = await getWeddingContent();
  const rendered = renderConfirmationEmail({
    wedding,
    guest: {
      firstName: row.first_name,
      lastName: row.last_name,
      guestCount: row.guest_count,
      mealPreference: row.meal_preference,
      plusOneName: row.plus_one_name,
    },
    websiteUrl: siteUrl,
  });

  const result = await sendEmail({ to: row.email, ...rendered });

  // Record the outcome; a tracking failure must not mask the send result.
  const supabase = await getSupabaseAuthClient();
  const { error: trackError } = await supabase
    .from("rsvps")
    .update(
      result.ok
        ? {
            confirmation_email_status: "sent",
            confirmation_email_sent_at: new Date().toISOString(),
            confirmation_email_message_id: result.messageId,
            confirmation_email_error: null,
          }
        : {
            confirmation_email_status: "failed",
            confirmation_email_error: result.error,
          },
    )
    .eq("id", rsvpId);
  if (trackError) {
    console.error("[confirmation-service] tracking update failed:", trackError.message);
  }

  return result;
}
