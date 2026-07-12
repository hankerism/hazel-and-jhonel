import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { StoryMilestone } from "@/types/wedding";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

interface StoryProps {
  milestones: StoryMilestone[];
}

export function Story({ milestones }: StoryProps) {
  if (milestones.length === 0) return null;

  const cols =
    milestones.length % 3 === 0 || milestones.length > 4
      ? "sm:grid-cols-3"
      : "sm:grid-cols-2";

  return (
    <section id="story" className="px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Our Story" title="Moments That Led Here" />

        <ol className={`mt-16 grid gap-14 sm:mt-20 sm:gap-10 ${cols}`}>
          {milestones.map((milestone, i) => (
            <Reveal
              as="li"
              key={milestone.id}
              delay={Math.min(i * 150, 450)}
              className="flex flex-col items-center gap-4 text-center"
            >
              {milestone.imageUrl ? (
                <span className="relative mb-1 block h-24 w-24 overflow-hidden rounded-full">
                  <Image
                    src={milestone.imageUrl}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="font-serif text-2xl font-light text-gold">
                  {ROMAN[i] ?? i + 1}
                </span>
              )}
              <span aria-hidden className="h-px w-10 bg-line" />
              <h3 className="font-serif text-2xl font-normal tracking-wide">
                {milestone.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed whitespace-pre-line text-stone">
                {milestone.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
