import { Reveal } from "@/components/ui/reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  /** Invert colors for dark backgrounds. */
  tone?: "light" | "dark";
}

/** Centered editorial heading: eyebrow, serif title, gold hairline. */
export function SectionHeading({
  eyebrow,
  title,
  tone = "light",
}: SectionHeadingProps) {
  const eyebrowColor = tone === "light" ? "text-gold-deep" : "text-gold";
  const titleColor = tone === "light" ? "text-charcoal" : "text-ivory";

  return (
    <Reveal className="flex flex-col items-center gap-5 text-center">
      <p className={`eyebrow ${eyebrowColor}`}>{eyebrow}</p>
      <h2
        className={`font-serif text-4xl font-light tracking-wide text-balance sm:text-5xl ${titleColor}`}
      >
        {title}
      </h2>
      <span aria-hidden className="h-px w-16 bg-gold" />
    </Reveal>
  );
}
