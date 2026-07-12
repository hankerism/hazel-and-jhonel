/** Core domain types for the wedding platform. All UI reads these shapes,
 * never raw database rows — see services/ for the mapping layer. */

export interface Wedding {
  id: string;
  slug: string;
  brideName: string;
  groomName: string;
  /** ISO date, e.g. "2026-11-30" */
  weddingDate: string;
  /** 24h time, e.g. "16:00" */
  ceremonyTime: string;
  /** IANA timezone, e.g. "Asia/Manila" */
  timezone: string;
  ceremonyVenue: string;
  /** Address lines, ready for display */
  ceremonyAddress: string[];
  receptionTime: string;
  receptionVenue: string;
  receptionAddress: string[];
  /** ISO date */
  rsvpDeadline: string;
  dressCode: string;
  weddingColors: string[];
  parkingNote: string;
  welcomeMessage: string;
  heroImage: string;
  musicUrl: string;
  musicAutoplay: boolean;
}

export interface StoryMilestone {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface ScheduleItem {
  id: string;
  /** 24h time, e.g. "15:30" */
  time: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

export interface GalleryImage {
  id: string;
  src: string;
  caption: string | null;
  displayOrder: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

/** Everything the public site needs, fetched in one call. */
export interface WeddingContent {
  wedding: Wedding;
  story: StoryMilestone[];
  schedule: ScheduleItem[];
  gallery: GalleryImage[];
  faqs: Faq[];
  rsvpConfig: RsvpFormConfig;
}

export const RSVP_STATUSES = ["pending", "confirmed", "contacted"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export type ConfirmationEmailStatus = "sent" | "failed" | null;

/** A full RSVP row as the dashboard sees it. */
export interface RsvpRecord extends RsvpInput {
  id: string;
  status: RsvpStatus;
  createdAt: string;
  confirmationEmailStatus: ConfirmationEmailStatus;
  confirmationEmailSentAt: string | null;
  confirmationEmailMessageId: string | null;
  confirmationEmailError: string | null;
}

export const ATTENDANCE_VALUES = ["attending", "declining"] as const;
export type Attendance = (typeof ATTENDANCE_VALUES)[number];

/* ------------------------------------------------- RSVP form configuration */

export const RSVP_FIELD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "guestCount",
  "plusOneName",
  "mealPreference",
  "dietaryRestrictions",
  "songRequest",
  "message",
] as const;
export type RsvpFieldKey = (typeof RSVP_FIELD_KEYS)[number];

/** Identity fields the system depends on (records, duplicate detection):
 * always visible and required, whatever the stored configuration says. */
export const LOCKED_RSVP_FIELDS: readonly RsvpFieldKey[] = [
  "firstName",
  "lastName",
  "email",
];

export interface RsvpFieldConfig {
  key: RsvpFieldKey;
  visible: boolean;
  required: boolean;
  label: string;
  placeholder: string | null;
  helpText: string | null;
}

export interface MealOption {
  id: string;
  label: string;
  sortOrder: number;
}

export interface RsvpFormConfig {
  fields: Record<RsvpFieldKey, RsvpFieldConfig>;
  mealOptions: MealOption[];
  maxGuests: number;
  allowDecline: boolean;
  /** Show plus-one fields only when the party size is above one. */
  plusOneConditional: boolean;
}

export interface RsvpInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  attendance: Attendance;
  guestCount: number;
  plusOneName: string | null;
  /** Validated against the wedding's configured meal options. */
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  songRequest: string | null;
  message: string | null;
}

export type RsvpResult =
  | { ok: true }
  | { ok: false; reason: "duplicate" | "error" };
