import { PageHeader } from "@/components/dashboard/ui";
import { StoryManager } from "@/features/dashboard/story/story-manager";
import { getWeddingContent } from "@/services/wedding-service";

export default async function StoryPage() {
  const { wedding, story } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="Story"
        description="The milestones of your love story. Drag to reorder — guests see them left to right."
      />
      <StoryManager weddingId={wedding.id} initial={story} />
    </>
  );
}
