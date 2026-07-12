import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Faq as FaqItem } from "@/types/wedding";

interface FaqProps {
  faqs: FaqItem[];
}

/** Accordion built on <details>/<summary> — accessible with zero JS. */
export function Faq({ faqs }: FaqProps) {
  return (
    <section id="faq" className="px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-2xl">
        <SectionHeading eyebrow="Questions" title="Good to Know" />

        <div className="mt-16 sm:mt-20">
          {faqs.map((faq, i) => (
            <Reveal key={faq.id} delay={Math.min(i * 80, 400)}>
              <details className="group border-b border-line first:border-t">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-serif text-xl font-light tracking-wide transition-colors hover:text-gold-deep [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span
                    aria-hidden
                    className="text-2xl font-light text-gold transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 text-sm leading-relaxed text-stone">
                  {faq.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
