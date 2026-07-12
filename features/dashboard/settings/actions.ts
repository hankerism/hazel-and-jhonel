"use server";

import { updateRow, revalidateSite, type ActionResult } from "@/lib/dashboard/crud";

export interface MusicSettingsInput {
  musicUrl: string;
  musicAutoplay: boolean;
}

export async function updateMusicSettings(
  weddingId: string,
  input: MusicSettingsInput,
): Promise<ActionResult> {
  const url = input.musicUrl.trim();
  if (!/^(https?:\/\/|\/)/.test(url)) {
    return { ok: false, error: "Music URL must start with https://… or /." };
  }
  const result = await updateRow("weddings", weddingId, {
    music_url: url,
    music_autoplay: input.musicAutoplay,
  });
  if (result.ok) revalidateSite("/dashboard/settings");
  return result;
}
