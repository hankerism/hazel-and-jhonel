"use server";

import { revalidatePath } from "next/cache";
import { updateRow } from "@/lib/dashboard/crud";
import { getSiteUrl } from "@/lib/site-url";
import { isSmtpConfigured } from "@/lib/env";
import {
  getRsvpEmailTracking,
  sendRsvpConfirmation,
} from "@/services/email/confirmation-service";
import { RSVP_STATUSES, type RsvpStatus } from "@/types/wedding";

/** What happened to the confirmation email alongside a status change. */
export type EmailOutcome =
  | { attempted: false; reason: "not-applicable" | "already-sent" | "not-configured" }
  | { attempted: true; sent: true; messageId: string; sentAt: string }
  | { attempted: true; sent: false; error: string };

export type StatusUpdateResult =
  | { ok: true; email: EmailOutcome }
  | { ok: false; error: string };

/**
 * Change an RSVP's status. Confirming an accepted RSVP automatically sends
 * the confirmation email exactly once: if a previous send succeeded, it is
 * NEVER auto-resent (only the dedicated resend action may). An email
 * failure never rolls back the status change.
 */
export async function updateRsvpStatus(
  id: string,
  status: RsvpStatus,
): Promise<StatusUpdateResult> {
  if (!RSVP_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown status." };
  }

  // Read tracking state BEFORE the update so the once-only rule can't race.
  const before = status === "confirmed" ? await getRsvpEmailTracking(id) : null;

  const result = await updateRow("rsvps", id, { status });
  if (!result.ok) return result;

  let email: EmailOutcome = { attempted: false, reason: "not-applicable" };

  if (status === "confirmed" && before && before.attendance === "attending") {
    if (before.confirmation_email_status === "sent") {
      email = { attempted: false, reason: "already-sent" };
    } else if (!isSmtpConfigured()) {
      email = { attempted: false, reason: "not-configured" };
    } else {
      const sendResult = await sendRsvpConfirmation(id, await getSiteUrl());
      email = sendResult.ok
        ? {
            attempted: true,
            sent: true,
            messageId: sendResult.messageId,
            sentAt: new Date().toISOString(),
          }
        : { attempted: true, sent: false, error: sendResult.error };
    }
  }

  revalidatePath("/dashboard/rsvps");
  revalidatePath("/dashboard");
  return { ok: true, email };
}

/** Deliberate resend — the only path that sends after a successful send. */
export async function resendConfirmationEmail(
  id: string,
): Promise<StatusUpdateResult> {
  const row = await getRsvpEmailTracking(id);
  if (!row) return { ok: false, error: "RSVP not found." };

  const sendResult = await sendRsvpConfirmation(id, await getSiteUrl());
  revalidatePath("/dashboard/rsvps");

  return {
    ok: true,
    email: sendResult.ok
      ? {
          attempted: true,
          sent: true,
          messageId: sendResult.messageId,
          sentAt: new Date().toISOString(),
        }
      : { attempted: true, sent: false, error: sendResult.error },
  };
}
