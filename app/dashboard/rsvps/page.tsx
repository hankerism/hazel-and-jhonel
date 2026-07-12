import { PageHeader } from "@/components/dashboard/ui";
import { RsvpTable } from "@/features/dashboard/rsvps/rsvp-table";
import { listRsvps } from "@/services/rsvp-admin-service";
import { getWeddingContent } from "@/services/wedding-service";

export default async function RsvpsPage() {
  const { wedding } = await getWeddingContent();
  const rsvps = await listRsvps(wedding.id);
  return (
    <>
      <PageHeader
        title="RSVP Responses"
        description="Every response, searchable. Click a guest for the full story."
      />
      <RsvpTable initial={rsvps} />
    </>
  );
}
