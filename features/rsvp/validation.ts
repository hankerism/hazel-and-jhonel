import {
  ATTENDANCE_VALUES,
  type Attendance,
  type RsvpFormConfig,
  type RsvpInput,
} from "@/types/wedding";

export type FieldErrors = Partial<Record<keyof RsvpInput, string>>;

export type ParseResult =
  | { ok: true; input: RsvpInput }
  | { ok: false; fieldErrors: FieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (data: FormData, key: string): string =>
  String(data.get(key) ?? "").trim();

const optional = (value: string): string | null => (value ? value : null);

export const RSVP_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "attendance",
  "guestCount",
  "plusOneName",
  "mealPreference",
  "dietaryRestrictions",
  "songRequest",
  "message",
] as const;

export type RsvpFieldValues = Partial<Record<(typeof RSVP_FIELDS)[number], string>>;

/** Raw submitted values, echoed back so a failed submit keeps what the
 * guest typed (React resets uncontrolled fields after every action). */
export function extractValues(data: FormData): RsvpFieldValues {
  const values: RsvpFieldValues = {};
  for (const field of RSVP_FIELDS) values[field] = text(data, field);
  return values;
}

/**
 * Validates raw form data into a typed RsvpInput, honoring the wedding's
 * form configuration: hidden fields are ignored, required flags are
 * enforced, guest counts respect the configured maximum, and meal choices
 * must be one of the configured options. Identity fields are always
 * required (they anchor the record and duplicate detection); declining
 * guests only need those plus an optional message.
 */
export function parseRsvpForm(
  data: FormData,
  config: RsvpFormConfig,
): ParseResult {
  const fieldErrors: FieldErrors = {};
  const fields = config.fields;

  const firstName = text(data, "firstName");
  const lastName = text(data, "lastName");
  const email = text(data, "email");
  const attendanceRaw = text(data, "attendance");

  if (!firstName) fieldErrors.firstName = "Please share your first name.";
  if (!lastName) fieldErrors.lastName = "Please share your last name.";
  if (!email) fieldErrors.email = "Please share your email address.";
  else if (!EMAIL_PATTERN.test(email))
    fieldErrors.email = "That email address doesn't look quite right.";

  if (!(ATTENDANCE_VALUES as readonly string[]).includes(attendanceRaw)) {
    fieldErrors.attendance = "Please let us know if you can join us.";
    return { ok: false, fieldErrors };
  }
  const attendance = attendanceRaw as Attendance;

  if (attendance === "declining" && !config.allowDecline) {
    fieldErrors.attendance = "Please let us know if you can join us.";
    return { ok: false, fieldErrors };
  }

  const attending = attendance === "attending";

  /** Value for an optional-capable text field, honoring visibility and
   * requiredness. Only consulted for the attending branch. */
  const configuredText = (
    key: "phone" | "plusOneName" | "dietaryRestrictions" | "songRequest",
  ): string | null => {
    const cfg = fields[key];
    if (!cfg.visible) return null;
    const value = text(data, key);
    if (cfg.required && !value) {
      fieldErrors[key] = `Please fill in ${cfg.label.toLowerCase()}.`;
    }
    return optional(value);
  };

  let guestCount = 1;
  let mealPreference: string | null = null;
  let phone: string | null = null;
  let plusOneName: string | null = null;
  let dietaryRestrictions: string | null = null;
  let songRequest: string | null = null;

  if (attending) {
    if (fields.guestCount.visible) {
      guestCount = Number.parseInt(text(data, "guestCount"), 10);
      if (
        !Number.isInteger(guestCount) ||
        guestCount < 1 ||
        guestCount > config.maxGuests
      ) {
        fieldErrors.guestCount = "Please choose how many seats you need.";
      }
    }

    const mealVisible =
      fields.mealPreference.visible && config.mealOptions.length > 0;
    if (mealVisible) {
      const meal = text(data, "mealPreference");
      if (config.mealOptions.some((o) => o.label === meal)) {
        mealPreference = meal;
      } else if (fields.mealPreference.required || meal) {
        fieldErrors.mealPreference = "Please choose a meal preference.";
      }
    }

    phone = configuredText("phone");
    dietaryRestrictions = configuredText("dietaryRestrictions");
    songRequest = configuredText("songRequest");

    const plusOneApplies =
      !config.plusOneConditional || guestCount > 1;
    if (plusOneApplies) plusOneName = configuredText("plusOneName");
  }

  const message = fields.message.visible ? optional(text(data, "message")) : null;
  if (attending && fields.message.visible && fields.message.required && !message) {
    fieldErrors.message = `Please fill in ${fields.message.label.toLowerCase()}.`;
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    input: {
      firstName,
      lastName,
      email,
      phone: phone ?? "",
      attendance,
      guestCount: attending ? guestCount : 0,
      plusOneName,
      mealPreference,
      dietaryRestrictions,
      songRequest,
      message,
    },
  };
}
