"use server";

import {
  deleteRow,
  insertRow,
  reorderRows,
  revalidateSite,
  updateRow,
  type ActionResult,
} from "@/lib/dashboard/crud";

const PATH = "/dashboard/schedule";

export interface ScheduleInput {
  time: string;
  title: string;
  description: string;
}

const toRow = (input: ScheduleInput) => ({
  event_time: input.time,
  title: input.title.trim(),
  description: input.description.trim() || null,
});

const validate = (input: ScheduleInput): string | null => {
  if (!/^\d{2}:\d{2}$/.test(input.time)) return "Please pick a time.";
  if (!input.title.trim()) return "A title is required.";
  return null;
};

export async function addScheduleItem(
  weddingId: string,
  input: ScheduleInput,
  sortOrder: number,
): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  const result = await insertRow("schedule_items", {
    wedding_id: weddingId,
    ...toRow(input),
    sort_order: sortOrder,
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function updateScheduleItem(
  id: string,
  input: ScheduleInput,
): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  const result = await updateRow("schedule_items", id, toRow(input));
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function deleteScheduleItem(id: string): Promise<ActionResult> {
  const result = await deleteRow("schedule_items", id);
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function reorderScheduleItems(ids: string[]): Promise<ActionResult> {
  const result = await reorderRows("schedule_items", "sort_order", ids);
  if (result.ok) revalidateSite(PATH);
  return result;
}
