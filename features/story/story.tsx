import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const MILESTONES = [
  {
    numeral: "I",
    title: "How We Met",
    text: "Two paths crossed at just the right moment, and a conversation that was never meant to end — didn't.",
  },
  {
    numeral: "II",
    title: "The Proposal",
    text: "One quiet, perfect question. One joyful, certain yes. And everything after became ours to plan together.",
  },
  {
    numeral: "III",
    title: "See You At The Wedding",
    text: "The best chapter is the one we write next — and it begins with you there beside us.",
  },
] as const;

export function Story() {
  return (
    <section id="story" className="px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Our Story" title="Three Moments That Led Here" />

        <ol className="mt-16 grid gap-14 sm:mt-20 sm:grid-cols-3 sm:gap-10">
          {MILESTONES.map((milestone, i) => (
            <Reveal
              as="li"
              key={milestone.title}
              delay={i * 150}
              className="flex flex-col items-center gap-4 text-center"
            >
              <span className="font-serif text-2xl font-light text-gold">
                {milestone.numeral}
              </span>
              <span aria-hidden className="h-px w-10 bg-line" />
              <h3 className="font-serif text-2xl font-normal tracking-wide">
                {milestone.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-stone">
                {milestone.text}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
