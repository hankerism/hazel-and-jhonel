import { PageHeader } from "@/components/dashboard/ui";
import { GalleryManager } from "@/features/dashboard/gallery/gallery-manager";
import { getWeddingContent } from "@/services/wedding-service";

export default async function GalleryPage() {
  const { wedding, gallery } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="Gallery"
        description="The photos guests see. Paste image URLs for now — direct uploads arrive with Supabase Storage."
      />
      <GalleryManager weddingId={wedding.id} initial={gallery} />
    </>
  );
}
