import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatTime12h } from "@/lib/datetime";
import type { ScheduleItem } from "@/types/wedding";

interface ScheduleProps {
  items: ScheduleItem[];
}

export function Schedule({ items }: ScheduleProps) {
  return (
    <section id="schedule" className="px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-2xl">
        <SectionHeading eyebrow="Schedule" title="The Order of the Day" />

        <ol className="mt-16 sm:mt-20">
          {items.map((item, i) => (
            <Reveal
              as="li"
              key={item.id}
              delay={Math.min(i * 80, 400)}
              className="grid grid-cols-[6rem_1fr] items-baseline gap-6 border-b border-line py-5 first:border-t sm:grid-cols-[8rem_1fr] sm:gap-10"
            >
              <span className="eyebrow text-right text-gold-deep">
                {formatTime12h(item.time)}
              </span>
              <div>
                <h3 className="font-serif text-2xl font-light tracking-wide">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-1 text-sm leading-relaxed text-stone">
                    {item.description}
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
