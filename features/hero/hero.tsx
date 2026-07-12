import Image from "next/image";
import { Countdown } from "@/components/countdown";
import { ButtonLink } from "@/components/ui/button-link";
import { formatLongDate, formatTime12h, toInstantIso } from "@/lib/datetime";
import type { Wedding } from "@/types/wedding";

interface HeroProps {
  wedding: Wedding;
}

export function Hero({ wedding }: HeroProps) {
  const ceremonyInstant = toInstantIso(
    wedding.weddingDate,
    wedding.ceremonyTime,
    wedding.timezone,
  );

  return (
    <section id="top" className="relative flex min-h-svh flex-col text-ivory">
      <Image
        src={wedding.heroImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Legibility scrim */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-ink/70 via-ink/40 to-ink/75"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 pt-28 pb-16 text-center">
        <p className="eyebrow text-gold">Together with their families</p>

        {/* Stacked on mobile — name / & / name — one line from sm up. */}
        <h1 className="flex flex-col items-center gap-2 font-serif text-5xl font-light tracking-wide sm:block sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="whitespace-nowrap">{wedding.brideName}</span>{" "}
          <span className="font-light italic text-gold sm:mx-6">&amp;</span>{" "}
          <span className="whitespace-nowrap">{wedding.groomName}</span>
        </h1>

        <div className="flex flex-col items-center gap-3">
          <span aria-hidden className="h-px w-16 bg-gold" />
          <p className="eyebrow text-sm">
            {formatLongDate(wedding.weddingDate)} · {formatTime12h(wedding.ceremonyTime)}
          </p>
          <p className="font-serif text-xl font-light italic tracking-wide text-ivory/90">
            {wedding.ceremonyVenue}
          </p>
        </div>

        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <ButtonLink href="#rsvp" variant="solid-light">
            RSVP Now
          </ButtonLink>
          <ButtonLink href="#details" variant="ghost-light">
            View Details
          </ButtonLink>
        </div>

        <div className="mt-10">
          <Countdown target={ceremonyInstant} />
        </div>
      </div>
    </section>
  );
}
