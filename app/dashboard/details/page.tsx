import { PageHeader } from "@/components/dashboard/ui";
import { DetailsForm } from "@/features/dashboard/details/details-form";
import { getWeddingContent } from "@/services/wedding-service";

export default async function DetailsPage() {
  const { wedding } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="Wedding Details"
        description="The essentials shown across the website — names, dates, venues, and your welcome."
      />
      <DetailsForm wedding={wedding} />
    </>
  );
}
