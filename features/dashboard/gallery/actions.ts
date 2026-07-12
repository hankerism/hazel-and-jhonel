"use server";

import {
  deleteRow,
  insertRow,
  reorderRows,
  revalidateSite,
  updateRow,
  type ActionResult,
} from "@/lib/dashboard/crud";

const PATH = "/dashboard/gallery";

export interface GalleryInput {
  imageUrl: string;
  caption: string;
}

export async function addGalleryImage(
  weddingId: string,
  input: GalleryInput,
  displayOrder: number,
): Promise<ActionResult> {
  const url = input.imageUrl.trim();
  if (!/^(https?:\/\/|\/)/.test(url)) {
    return { ok: false, error: "Please provide an image URL (https://… or /path)." };
  }
  const result = await insertRow("gallery_images", {
    wedding_id: weddingId,
    image_url: url,
    caption: input.caption.trim() || null,
    display_order: displayOrder,
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function updateGalleryCaption(
  id: string,
  caption: string,
): Promise<ActionResult> {
  const result = await updateRow("gallery_images", id, {
    caption: caption.trim() || null,
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function deleteGalleryImage(id: string): Promise<ActionResult> {
  const result = await deleteRow("gallery_images", id);
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function reorderGalleryImages(ids: string[]): Promise<ActionResult> {
  const result = await reorderRows("gallery_images", "display_order", ids);
  if (result.ok) revalidateSite(PATH);
  return result;
}
