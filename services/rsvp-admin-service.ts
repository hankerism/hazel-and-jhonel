import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";
import type { Attendance, RsvpRecord, RsvpStatus } from "@/types/wedding";

interface RsvpRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  attendance: string;
  guest_count: number;
  plus_one_name: string | null;
  meal_preference: string | null;
  dietary_restrictions: string | null;
  song_request: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

/** All responses for a wedding, newest first. Runs as the signed-in couple —
 * RLS grants authenticated read via migration 00002 (empty until then). */
export async function listRsvps(weddingId: string): Promise<RsvpRecord[]> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("rsvps")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[rsvp-admin-service] list failed:", error.message);
    return [];
  }

  return ((data as RsvpRow[]) ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    attendance: row.attendance as Attendance,
    guestCount: row.guest_count,
    plusOneName: row.plus_one_name,
    mealPreference: row.meal_preference as RsvpRecord["mealPreference"],
    dietaryRestrictions: row.dietary_restrictions,
    songRequest: row.song_request,
    message: row.message,
    status: row.status as RsvpStatus,
    createdAt: row.created_at,
  }));
}
