"use server";

import { updateRow, revalidateSite, type ActionResult } from "@/lib/dashboard/crud";

export interface WeddingDetailsInput {
  brideName: string;
  groomName: string;
  weddingDate: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  receptionTime: string;
  receptionVenue: string;
  receptionAddress: string;
  rsvpDeadline: string;
  dressCode: string;
  /** Comma-separated in the form, stored as text[] */
  weddingColors: string;
  parkingNote: string;
  welcomeMessage: string;
  heroImage: string;
}

export async function updateWeddingDetails(
  weddingId: string,
  input: WeddingDetailsInput,
): Promise<ActionResult> {
  const required: (keyof WeddingDetailsInput)[] = [
    "brideName",
    "groomName",
    "weddingDate",
    "ceremonyTime",
    "ceremonyVenue",
    "receptionTime",
    "receptionVenue",
    "rsvpDeadline",
  ];
  for (const key of required) {
    if (!input[key]?.trim()) {
      return { ok: false, error: `Please fill in ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.` };
    }
  }

  const result = await updateRow("weddings", weddingId, {
    bride_name: input.brideName.trim(),
    groom_name: input.groomName.trim(),
    wedding_date: input.weddingDate,
    ceremony_time: input.ceremonyTime,
    ceremony_venue: input.ceremonyVenue.trim(),
    ceremony_address: input.ceremonyAddress.trim(),
    reception_time: input.receptionTime,
    reception_venue: input.receptionVenue.trim(),
    reception_address: input.receptionAddress.trim(),
    rsvp_deadline: input.rsvpDeadline,
    dress_code: input.dressCode.trim(),
    wedding_colors: input.weddingColors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    parking_note: input.parkingNote.trim(),
    welcome_message: input.welcomeMessage.trim(),
    hero_image: input.heroImage.trim(),
  });

  if (result.ok) revalidateSite("/dashboard/details", "/dashboard");
  return result;
}
