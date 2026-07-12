import { PageHeader } from "@/components/dashboard/ui";
import { ScheduleManager } from "@/features/dashboard/schedule/schedule-manager";
import { getWeddingContent } from "@/services/wedding-service";

export default async function SchedulePage() {
  const { wedding, schedule } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="Schedule"
        description="The order of the day. Drag events to reorder them."
      />
      <ScheduleManager weddingId={wedding.id} initial={schedule} />
    </>
  );
}
