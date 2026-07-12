import { PageHeader } from "@/components/dashboard/ui";
import { SettingsForm } from "@/features/dashboard/settings/settings-form";
import { getWeddingContent } from "@/services/wedding-service";

export default async function SettingsPage() {
  const { wedding } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="Settings"
        description="How the website behaves for your guests."
      />
      <SettingsForm wedding={wedding} />
    </>
  );
}
