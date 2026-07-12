"use server";

import {
  deleteRow,
  insertRow,
  reorderRows,
  revalidateSite,
  updateRow,
  type ActionResult,
} from "@/lib/dashboard/crud";

const PATH = "/dashboard/faqs";

export interface FaqInput {
  question: string;
  answer: string;
}

const validate = (input: FaqInput): string | null =>
  !input.question.trim() || !input.answer.trim()
    ? "Both a question and an answer are required."
    : null;

export async function addFaq(
  weddingId: string,
  input: FaqInput,
  displayOrder: number,
): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  const result = await insertRow("faqs", {
    wedding_id: weddingId,
    question: input.question.trim(),
    answer: input.answer.trim(),
    display_order: displayOrder,
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function updateFaq(id: string, input: FaqInput): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  const result = await updateRow("faqs", id, {
    question: input.question.trim(),
    answer: input.answer.trim(),
  });
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  const result = await deleteRow("faqs", id);
  if (result.ok) revalidateSite(PATH);
  return result;
}

export async function reorderFaqs(ids: string[]): Promise<ActionResult> {
  const result = await reorderRows("faqs", "display_order", ids);
  if (result.ok) revalidateSite(PATH);
  return result;
}
