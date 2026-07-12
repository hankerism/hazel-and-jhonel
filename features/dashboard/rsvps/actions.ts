"use server";

import { revalidatePath } from "next/cache";
import { updateRow, type ActionResult } from "@/lib/dashboard/crud";
import { RSVP_STATUSES, type RsvpStatus } from "@/types/wedding";

export async function updateRsvpStatus(
  id: string,
  status: RsvpStatus,
): Promise<ActionResult> {
  if (!RSVP_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown status." };
  }
  const result = await updateRow("rsvps", id, { status });
  if (result.ok) {
    revalidatePath("/dashboard/rsvps");
    revalidatePath("/dashboard");
  }
  return result;
}
