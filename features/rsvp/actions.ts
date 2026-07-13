"use server";

import { after } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { getWeddingContent } from "@/services/wedding-service";
import { saveRsvp } from "@/services/rsvp-service";
import { sendNewRsvpNotification } from "@/services/email/notification-service";
import {
  extractValues,
  parseRsvpForm,
  type FieldErrors,
  type RsvpFieldValues,
} from "./validation";
import type { Attendance } from "@/types/wedding";

export type RsvpFormState =
  | { status: "idle" }
  | { status: "success"; attendance: Attendance; firstName: string }
  | { status: "duplicate" }
  | {
      status: "error";
      message: string;
      fieldErrors?: FieldErrors;
      /** Echoed form values so the guest's input survives the round trip. */
      values: RsvpFieldValues;
    };

export async function submitRsvp(
  _prev: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const values = extractValues(formData);

  // Validation follows the couple's stored form configuration.
  const { wedding, rsvpConfig } = await getWeddingContent();
  const parsed = parseRsvpForm(formData, rsvpConfig);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please review the highlighted fields.",
      fieldErrors: parsed.fieldErrors,
      values,
    };
  }

  const result = await saveRsvp(wedding.id, parsed.input);

  if (!result.ok) {
    if (result.reason === "duplicate") return { status: "duplicate" };
    return {
      status: "error",
      message:
        "Something went wrong while sending your response. Please try again in a moment.",
      values,
    };
  }

  // Notify the couple about the new RSVP — only here, on initial creation
  // (edits, status changes, and resends live in the dashboard actions).
  // Scheduled after the response so the guest never waits on SMTP, and the
  // service swallows failures so the saved RSVP is never rolled back.
  const submittedAt = new Date().toISOString();
  const siteUrl = await getSiteUrl();
  after(() =>
    sendNewRsvpNotification({
      wedding,
      rsvp: parsed.input,
      submittedAt,
      siteUrl,
    }),
  );

  return {
    status: "success",
    attendance: parsed.input.attendance,
    firstName: parsed.input.firstName,
  };
}
