"use server";

import { getWeddingContent } from "@/services/wedding-service";
import { saveRsvp } from "@/services/rsvp-service";
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

  return {
    status: "success",
    attendance: parsed.input.attendance,
    firstName: parsed.input.firstName,
  };
}
