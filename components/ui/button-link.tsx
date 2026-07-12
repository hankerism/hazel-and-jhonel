import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

type Variant = "solid" | "solid-light" | "outline" | "ghost-light";

const base =
  "inline-flex items-center justify-center px-8 py-3.5 eyebrow transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

const variants: Record<Variant, string> = {
  /* Black, warming to gold — the house button. */
  solid: "bg-charcoal text-ivory hover:bg-gold-deep",
  outline:
    "border border-charcoal/30 text-charcoal hover:border-gold-deep hover:text-gold-deep",
  /* Primary CTA on dark photographic backgrounds. */
  "solid-light":
    "border border-ivory bg-ivory text-charcoal hover:border-gold hover:bg-gold hover:text-ivory",
  /* For dark photographic backgrounds. */
  "ghost-light":
    "border border-ivory/60 text-ivory hover:bg-ivory hover:text-charcoal",
};

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
}

export function ButtonLink({
  href,
  variant = "solid",
  className = "",
  children,
  ...rest
}: ButtonLinkProps) {
  const isExternal = href.startsWith("http");
  const classes = `${base} ${variants[variant]} ${className}`;

  if (isExternal) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
