import { buildIcs } from "@/lib/calendar";
import { getWeddingContent } from "@/services/wedding-service";

/** Downloadable calendar event for the wedding (linked from emails). */
export async function GET() {
  const { wedding } = await getWeddingContent();
  return new Response(buildIcs(wedding), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wedding.ics"',
    },
  });
}
