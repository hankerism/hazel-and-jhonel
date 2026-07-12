import { PageHeader } from "@/components/dashboard/ui";
import { EmailCard } from "@/features/dashboard/settings/email-card";
import { SettingsForm } from "@/features/dashboard/settings/settings-form";
import { env, isSmtpConfigured } from "@/lib/env";
import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";
import { getWeddingContent } from "@/services/wedding-service";

export default async function SettingsPage() {
  const { wedding } = await getWeddingContent();
  const supabase = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader
        title="Settings"
        description="How the website behaves for your guests."
      />
      <div className="flex flex-col gap-6">
        <EmailCard
          configured={isSmtpConfigured()}
          fromEmail={env.smtp.fromEmail ?? null}
          userEmail={user?.email ?? "your account email"}
        />
        <SettingsForm wedding={wedding} />
      </div>
    </>
  );
}
