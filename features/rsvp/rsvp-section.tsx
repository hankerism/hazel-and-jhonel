import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { formatLongDate } from "@/lib/datetime";
import type { RsvpFormConfig, Wedding } from "@/types/wedding";
import { RsvpForm } from "./rsvp-form";

interface RsvpSectionProps {
  wedding: Wedding;
  rsvpConfig: RsvpFormConfig;
}

export function RsvpSection({ wedding, rsvpConfig }: RsvpSectionProps) {
  const deadline = formatLongDate(wedding.rsvpDeadline, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section id="rsvp" className="bg-ink px-6 py-28 text-ivory sm:py-36">
      <div className="mx-auto max-w-2xl">
        <SectionHeading
          eyebrow="RSVP"
          title="Will you be celebrating with us?"
          tone="dark"
        />

        <Reveal className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="max-w-md font-serif text-lg font-light italic text-ivory/80">
            {wedding.welcomeMessage}
          </p>
          <p className="eyebrow mt-2 text-gold">Kindly respond by {deadline}</p>
        </Reveal>

        <Reveal delay={150} className="mt-14">
          <RsvpForm
            coupleNames={`${wedding.brideName} & ${wedding.groomName}`}
            config={rsvpConfig}
          />
        </Reveal>
      </div>
    </section>
  );
}
