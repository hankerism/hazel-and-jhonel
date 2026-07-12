import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatTime12h, mapsUrl } from "@/lib/datetime";
import type { Wedding } from "@/types/wedding";

interface DetailsProps {
  wedding: Wedding;
}

const cardClass =
  "flex h-full flex-col items-center gap-4 border border-line bg-ivory px-8 py-10 text-center";

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h3 className="font-serif text-2xl font-normal tracking-wide">{children}</h3>
      <span aria-hidden className="h-px w-10 bg-gold" />
    </>
  );
}

export function Details({ wedding }: DetailsProps) {
  const venues = [
    {
      title: "The Ceremony",
      time: formatTime12h(wedding.ceremonyTime),
      venue: wedding.ceremonyVenue,
      address: wedding.ceremonyAddress,
    },
    {
      title: "The Reception",
      time: formatTime12h(wedding.receptionTime),
      venue: wedding.receptionVenue,
      address: wedding.receptionAddress,
    },
  ];

  return (
    <section id="details" className="bg-parchment px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Wedding Details" title="The Where & The When" />

        {/* Ceremony and reception */}
        <div className="mt-16 grid gap-6 sm:mt-20 md:grid-cols-2">
          {venues.map((item, i) => (
            <Reveal key={item.title} delay={i * 150}>
              <div className={cardClass}>
                <CardTitle>{item.title}</CardTitle>
                <p className="eyebrow text-gold-deep">{item.time}</p>
                <p className="font-serif text-xl font-light italic">{item.venue}</p>
                <p className="text-sm leading-relaxed text-stone">
                  {item.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                <a
                  href={mapsUrl(item.venue, item.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow mt-auto pt-2 text-gold-deep underline-offset-8 transition-colors hover:text-charcoal hover:underline"
                >
                  Get Directions
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Dress code, colors, parking */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Reveal delay={0}>
            <div className={cardClass}>
              <CardTitle>Dress Code</CardTitle>
              <p className="font-serif text-xl font-light italic">{wedding.dressCode}</p>
              <p className="text-sm leading-relaxed text-stone">
                Dress to the nines — we can&apos;t wait to see you at your finest.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className={cardClass}>
              <CardTitle>Color Palette</CardTitle>
              <div className="flex items-center gap-4" aria-hidden>
                <span className="h-9 w-9 rounded-full bg-ink ring-1 ring-line" />
                <span className="h-9 w-9 rounded-full bg-gold ring-1 ring-line" />
              </div>
              <p className="font-serif text-xl font-light italic">
                {wedding.weddingColors.join(" & ")}
              </p>
              <p className="text-sm leading-relaxed text-stone">
                We&apos;d love for you to echo our palette, though it is never required.
              </p>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className={cardClass}>
              <CardTitle>Parking</CardTitle>
              <p className="text-sm leading-relaxed text-stone">{wedding.parkingNote}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
