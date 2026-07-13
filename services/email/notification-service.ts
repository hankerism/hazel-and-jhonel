import { env, isSmtpConfigured } from "@/lib/env";
import type { RsvpInput, Wedding } from "@/types/wedding";
import { sendEmail, type SendResult } from "./mailer";
import { renderNewRsvpNotification } from "./templates/new-rsvp";

/**
 * Internal notifications for the couple — today, "a new RSVP arrived".
 * Fire-and-forget by contract: every failure is logged and swallowed here,
 * so callers on the guest path can never be blocked or broken by email.
 */

const DEFAULT_NOTIFICATION_RECIPIENT = "hazelandjhonel@gmail.com";

/**
 * The one place that decides where couple notifications go. Async so a
 * future dashboard setting (a weddings column read) can slot in without
 * touching any call site; until then: env override, then the default.
 */
export async function getRsvpNotificationRecipient(): Promise<string> {
  return env.rsvpNotificationEmail?.trim() || DEFAULT_NOTIFICATION_RECIPIENT;
}

export interface NewRsvpNotificationInput {
  wedding: Wedding;
  rsvp: RsvpInput;
  /** ISO instant of the submission. */
  submittedAt: string;
  siteUrl: string;
}

/** Notify the couple that a new RSVP is waiting for review. Never throws. */
export async function sendNewRsvpNotification(
  input: NewRsvpNotificationInput,
): Promise<SendResult> {
  try {
    if (!isSmtpConfigured()) {
      console.warn(
        "[notification-service] SMTP not configured — skipping new-RSVP notification.",
      );
      return { ok: false, error: "Email isn't configured." };
    }

    const to = await getRsvpNotificationRecipient();
    const rendered = renderNewRsvpNotification(input);
    const result = await sendEmail({ to, ...rendered });

    if (result.ok) {
      console.log(
        `[notification-service] new-RSVP notification sent to ${to} (${result.messageId})`,
      );
    } else {
      console.error(
        `[notification-service] new-RSVP notification failed: ${result.error}`,
      );
    }
    return result;
  } catch (err) {
    console.error("[notification-service] new-RSVP notification threw:", err);
    return { ok: false, error: "Notification failed unexpectedly." };
  }
}
