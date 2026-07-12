import type {
  MealOption,
  RsvpFieldConfig,
  RsvpFieldKey,
  RsvpFormConfig,
} from "@/types/wedding";

/**
 * Default RSVP form configuration — exactly the form as originally designed.
 * Stored rows in rsvp_form_fields override these per field; weddings columns
 * override the form-level settings. Untouched installs render identically
 * to the pre-configurable form.
 */

export const RSVP_FIELD_DEFAULTS: Record<RsvpFieldKey, RsvpFieldConfig> = {
  firstName: {
    key: "firstName",
    visible: true,
    required: true,
    label: "First Name",
    placeholder: null,
    helpText: null,
  },
  lastName: {
    key: "lastName",
    visible: true,
    required: true,
    label: "Last Name",
    placeholder: null,
    helpText: null,
  },
  email: {
    key: "email",
    visible: true,
    required: true,
    label: "Email",
    placeholder: null,
    helpText: null,
  },
  phone: {
    key: "phone",
    visible: true,
    required: false,
    label: "Phone Number",
    placeholder: null,
    helpText: null,
  },
  guestCount: {
    key: "guestCount",
    visible: true,
    required: true,
    label: "Number of Guests",
    placeholder: null,
    helpText: null,
  },
  plusOneName: {
    key: "plusOneName",
    visible: true,
    required: false,
    label: "Plus One Name",
    placeholder: null,
    helpText: null,
  },
  mealPreference: {
    key: "mealPreference",
    visible: true,
    required: true,
    label: "Meal Preference",
    placeholder: null,
    helpText: null,
  },
  dietaryRestrictions: {
    key: "dietaryRestrictions",
    visible: true,
    required: false,
    label: "Dietary Restrictions",
    placeholder: null,
    helpText: null,
  },
  songRequest: {
    key: "songRequest",
    visible: true,
    required: false,
    label: "Song Request",
    placeholder: "What will get you on the dance floor?",
    helpText: null,
  },
  message: {
    key: "message",
    visible: true,
    required: false,
    label: "Special Message",
    placeholder: null,
    helpText: null,
  },
};

export const DEFAULT_MEAL_OPTIONS: MealOption[] = [
  { id: "meal-1", label: "Beef", sortOrder: 1 },
  { id: "meal-2", label: "Chicken", sortOrder: 2 },
  { id: "meal-3", label: "Fish", sortOrder: 3 },
  { id: "meal-4", label: "Vegetarian", sortOrder: 4 },
];

export const DEFAULT_RSVP_FORM_CONFIG: RsvpFormConfig = {
  fields: RSVP_FIELD_DEFAULTS,
  mealOptions: DEFAULT_MEAL_OPTIONS,
  maxGuests: 10,
  allowDecline: true,
  plusOneConditional: false,
};

/** Human names for the dashboard field list. */
export const RSVP_FIELD_TITLES: Record<RsvpFieldKey, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone Number",
  guestCount: "Number of Guests",
  plusOneName: "Plus One Name",
  mealPreference: "Meal Preference",
  dietaryRestrictions: "Dietary Restrictions",
  songRequest: "Song Request",
  message: "Special Message",
};
