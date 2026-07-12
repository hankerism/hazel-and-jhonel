import { revalidatePath } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";

/**
 * Shared data helpers behind every dashboard server action. All writes run
 * as the signed-in user (RLS: authenticated policies from migration 00002).
 *
 * Not server actions themselves — each feature exports thin actions that
 * compose these and revalidate the affected routes.
 */

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const MIGRATION_HINT =
  "This feature needs migration 00002_dashboard.sql — run it in the Supabase SQL editor.";

/** Normalize Supabase/Postgres errors into a user-facing message. */
function friendly(error: { code?: string; message: string }): string {
  if (error.code === "42P01" || error.code === "42703") return MIGRATION_HINT; // missing table/column
  if (error.code === "42501") return "You don't have permission for that. " + MIGRATION_HINT;
  if (error.code === "23514") return "That value isn't allowed. " + MIGRATION_HINT;
  return error.message;
}

export async function insertRow(
  table: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select("id")
    .single<{ id: string }>();
  return error
    ? { ok: false, error: friendly(error) }
    : { ok: true, id: data.id };
}

export async function updateRow(
  table: string,
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await getSupabaseAuthClient();
  const { error, count } = await supabase
    .from(table)
    .update(values, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error) };
  // RLS silently filters rows it won't let you touch — surface that.
  if (count === 0) return { ok: false, error: "Nothing was updated. " + MIGRATION_HINT };
  return { ok: true };
}

export async function deleteRow(table: string, id: string): Promise<ActionResult> {
  const supabase = await getSupabaseAuthClient();
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error) };
  if (count === 0) return { ok: false, error: "Nothing was deleted. " + MIGRATION_HINT };
  return { ok: true };
}

/** Persist a new ordering: item ids in display order. */
export async function reorderRows(
  table: string,
  orderColumn: string,
  ids: string[],
): Promise<ActionResult> {
  const supabase = await getSupabaseAuthClient();
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase
      .from(table)
      .update({ [orderColumn]: index + 1 })
      .eq("id", id);
    if (error) return { ok: false, error: friendly(error) };
  }
  return { ok: true };
}

/** Revalidate the public site plus the dashboard page that changed. */
export function revalidateSite(...dashboardPaths: string[]): void {
  revalidatePath("/");
  for (const path of dashboardPaths) revalidatePath(path);
}
