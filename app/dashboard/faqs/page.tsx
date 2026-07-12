import { PageHeader } from "@/components/dashboard/ui";
import { FaqManager } from "@/features/dashboard/faqs/faq-manager";
import { getWeddingContent } from "@/services/wedding-service";

export default async function FaqsPage() {
  const { wedding, faqs } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="FAQs"
        description="Answers guests will look for. The list below previews exactly as the website's accordion."
      />
      <FaqManager weddingId={wedding.id} initial={faqs} />
    </>
  );
}
