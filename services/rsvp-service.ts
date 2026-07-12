import { getSupabaseClient } from "@/lib/supabase/server";
import type { RsvpInput, RsvpResult } from "@/types/wedding";

const UNIQUE_VIOLATION = "23505";

/**
 * Persists an RSVP into the Supabase rsvps table using the anon key —
 * RLS permits insert only, so guests can never read or alter responses.
 * Duplicate submissions (same wedding + email, case-insensitive) are
 * rejected by the unique index and surfaced as `duplicate`.
 */
export async function saveRsvp(
  weddingId: string,
  input: RsvpInput,
): Promise<RsvpResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error(
      "[rsvp-service] Supabase is not configured — RSVP cannot be saved. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return { ok: false, reason: "error" };
  }

  const { error } = await supabase.from("rsvps").insert({
    wedding_id: weddingId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    attendance: input.attendance,
    guest_count: input.guestCount,
    plus_one_name: input.plusOneName,
    meal_preference: input.mealPreference,
    dietary_restrictions: input.dietaryRestrictions,
    song_request: input.songRequest,
    message: input.message,
  });

  if (!error) return { ok: true };
  if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: "duplicate" };
  console.error("[rsvp-service] insert failed:", error.message);
  return { ok: false, reason: "error" };
}
