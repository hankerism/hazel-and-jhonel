"use server";

import {
  deleteRow,
  insertRow,
  reorderRows,
  revalidateSite,
  updateRow,
  upsertRow,
  type ActionResult,
} from "@/lib/dashboard/crud";
import {
  LOCKED_RSVP_FIELDS,
  RSVP_FIELD_KEYS,
  type RsvpFieldKey,
} from "@/types/wedding";

const PATH = "/dashboard/rsvp-form";

/* ----------------------------------------------------------- field config */

export interface FieldConfigInput {
  visible: boolean;
  required: boolean;
  label: string;
  placeholder: string;
  helpText: string;
}

export async function saveFieldConfig(
  weddingId: string,
  key: RsvpFieldKey,
  input: FieldConfigInput,
): Promise<ActionResult> {
  if (!RSVP_FIELD_KEYS.includes(key)) {
    return { ok: false, error: "Unknown field." };
  }
  if (!input.label.trim()) {
    return { ok: false, error: "A label is required." };
  }

  // Identity fields anchor records and duplicate detection.
  const locked = LOCKED_RSVP_FIELDS.includes(key);

  const result = await upsertRow(
    "rsvp_form_fields",
    {
      wedding_id: weddingId,
      field_key: key,
      visible: locked ? true : input.visible,
      required: locked ? true : input.required,
      label: input.label.trim(),
      placeholder: input.placeholder.trim() || null,
      help_text: input.helpText.trim() || null,
    },
    "wedding_id,field_key",
  );
  if (result.ok) revalidateSite(PATH);
  return result;
}

/* -------------------------------------------------------------- settings */

export interface RsvpFormSettingsInput {
  maxGuests: number;
  rsvpDeadline: string;
  allowDecline: boolean;
  plusOneConditional: boolean;
}

export async function saveRsvpFormSettings(
  weddingId: string,
  input: RsvpFormSettingsInput,
): Promise<ActionResult> {
  if (
    !Number.isInteger(input.maxGuests) ||
    input.maxGuests < 1 ||
    input.maxGuests > 20
  ) {
    return { ok: false, error: "Maximum guests must be between 1 and 20." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.rsvpDeadline)) {
    return { ok: false, error: "Please pick an RSVP deadline." };
  }

  const result = await updateRow("weddings", weddingId, {
    rsvp_max_guests: input.maxGuests,
    rsvp_deadline: input.rsvpDeadline,
    rsvp_allow_decline: input.allowDecline,
    rsvp_plus_one_conditional: input.plusOneConditional,
  });
  if (result.ok) revalidateSite(PATH, "/dashboard/details");
  return result;
}

/* ----------------------------------------------------------- meal options */

export async function addMealOption(
  weddingId: string,
  label: string,
  sortOrder: number,
): Promise<ActionResult> {
  if (!label.trim()) return { ok: false, error: "A label is required." };
  const result = await insertRow("meal_options", {
    wedding_id: weddingId,
    label: label.trim(),
    sort_order: sortOrder,
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function updateMealOption(
  id: string,
  label: string,
): Promise<ActionResult> {
  if (!label.trim()) return { ok: false, error: "A label is required." };
  const result = await updateRow("meal_options", id, { label: label.trim() });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function deleteMealOption(id: string): Promise<ActionResult> {
  const result = await deleteRow("meal_options", id);
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function reorderMealOptions(ids: string[]): Promise<ActionResult> {
  const result = await reorderRows("meal_options", "sort_order", ids);
  if (result.ok) revalidateSite(PATH);
  return result;
}
