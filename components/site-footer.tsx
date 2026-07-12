import { formatLongDate } from "@/lib/datetime";
import type { Wedding } from "@/types/wedding";

interface SiteFooterProps {
  wedding: Wedding;
}

export function SiteFooter({ wedding }: SiteFooterProps) {
  return (
    <footer className="bg-ink px-6 py-20 text-center text-ivory">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
        <p className="font-serif text-3xl font-light tracking-wide sm:text-4xl">
          {wedding.brideName}
          <span className="mx-3 italic text-gold">&amp;</span>
          {wedding.groomName}
        </p>
        <span aria-hidden className="h-px w-16 bg-gold" />
        <p className="eyebrow text-ivory/70">{formatLongDate(wedding.weddingDate)}</p>
        <p className="font-serif text-lg font-light italic text-ivory/80">
          Thank you for celebrating with us.
        </p>
      </div>
    </footer>
  );
}
