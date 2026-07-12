import {
  ATTENDANCE_VALUES,
  MEAL_PREFERENCES,
  type Attendance,
  type MealPreference,
  type RsvpInput,
} from "@/types/wedding";

export type FieldErrors = Partial<Record<keyof RsvpInput, string>>;

export type ParseResult =
  | { ok: true; input: RsvpInput }
  | { ok: false; fieldErrors: FieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_GUESTS = 10;

const text = (data: FormData, key: string): string =>
  String(data.get(key) ?? "").trim();

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

const optional = (value: string): string | null => (value ? value : null);

/** Validates raw form data into a typed RsvpInput. Only the fields relevant
 * to the chosen response are required: declining guests just need name and
 * email; phone is always optional. Attendance details are dropped for
 * declines. */
export function parseRsvpForm(data: FormData): ParseResult {
  const fieldErrors: FieldErrors = {};

  const firstName = text(data, "firstName");
  const lastName = text(data, "lastName");
  const email = text(data, "email");
  const phone = text(data, "phone");
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

  let guestCount = 1;
  let mealPreference: MealPreference | null = null;

  if (attendance === "attending") {
    guestCount = Number.parseInt(text(data, "guestCount"), 10);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > MAX_GUESTS) {
      fieldErrors.guestCount = "Please choose how many seats you need.";
    }

    const meal = text(data, "mealPreference");
    if ((MEAL_PREFERENCES as readonly string[]).includes(meal)) {
      mealPreference = meal as MealPreference;
    } else {
      fieldErrors.mealPreference = "Please choose a meal preference.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const attending = attendance === "attending";
  return {
    ok: true,
    input: {
      firstName,
      lastName,
      email,
      phone,
      attendance,
      guestCount: attending ? guestCount : 0,
      plusOneName: attending ? optional(text(data, "plusOneName")) : null,
      mealPreference: attending ? mealPreference : null,
      dietaryRestrictions: attending
        ? optional(text(data, "dietaryRestrictions"))
        : null,
      songRequest: attending ? optional(text(data, "songRequest")) : null,
      message: optional(text(data, "message")),
    },
  };
}
