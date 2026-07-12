"use server";

import {
  deleteRow,
  insertRow,
  reorderRows,
  revalidateSite,
  updateRow,
  type ActionResult,
} from "@/lib/dashboard/crud";

const PATH = "/dashboard/story";

export interface MilestoneInput {
  title: string;
  body: string;
  imageUrl: string;
}

const toRow = (input: MilestoneInput) => ({
  title: input.title.trim(),
  body: input.body.trim(),
  image_url: input.imageUrl.trim() || null,
});

export async function addMilestone(
  weddingId: string,
  input: MilestoneInput,
  sortOrder: number,
): Promise<ActionResult> {
  if (!input.title.trim()) return { ok: false, error: "A title is required." };
  const result = await insertRow("story_milestones", {
    wedding_id: weddingId,
    ...toRow(input),
    sort_order: sortOrder,
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function updateMilestone(
  id: string,
  input: MilestoneInput,
): Promise<ActionResult> {
  if (!input.title.trim()) return { ok: false, error: "A title is required." };
  const result = await updateRow("story_milestones", id, toRow(input));
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  const result = await deleteRow("story_milestones", id);
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function reorderMilestones(ids: string[]): Promise<ActionResult> {
  const result = await reorderRows("story_milestones", "sort_order", ids);
  if (result.ok) revalidateSite(PATH);
  return result;
}
