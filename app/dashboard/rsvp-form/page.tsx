import { PageHeader } from "@/components/dashboard/ui";
import { RsvpFormManager } from "@/features/dashboard/rsvp-form/rsvp-form-manager";
import { getWeddingContent } from "@/services/wedding-service";

export default async function RsvpFormPage() {
  const { wedding, rsvpConfig } = await getWeddingContent();
  return (
    <>
      <PageHeader
        title="RSVP Form"
        description="Shape the questions guests answer. Changes appear on the website the moment they're saved."
      />
      <RsvpFormManager
        weddingId={wedding.id}
        config={rsvpConfig}
        rsvpDeadline={wedding.rsvpDeadline}
      />
    </>
  );
}
