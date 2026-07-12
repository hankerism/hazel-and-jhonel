"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#story", label: "Our Story" },
  { href: "#details", label: "Details" },
  { href: "#schedule", label: "Schedule" },
  { href: "#gallery", label: "Gallery" },
  { href: "#faq", label: "FAQ" },
] as const;

interface SiteNavProps {
  monogram: string;
}

/**
 * Fixed navigation: transparent over the hero, ivory once scrolled.
 * Collapses to a full-screen overlay menu on mobile.
 */
export function SiteNav({ monogram }: SiteNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        solid
          ? "border-b border-line bg-ivory/95 text-charcoal backdrop-blur-sm"
          : "border-b border-transparent bg-transparent text-ivory"
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6"
      >
        <Link
          href="#top"
          className="font-serif text-2xl tracking-[0.18em]"
          onClick={() => setOpen(false)}
          aria-label="Back to top"
        >
          {monogram}
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-10 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="eyebrow transition-colors duration-300 hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="#rsvp"
            className={`eyebrow border px-5 py-2.5 transition-colors duration-300 ${
              solid
                ? "border-charcoal/40 hover:border-gold-deep hover:text-gold-deep"
                : "border-ivory/60 hover:bg-ivory hover:text-charcoal"
            }`}
          >
            RSVP
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            aria-hidden
            className={`h-px w-6 bg-current transition-transform duration-300 ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          />
          <span
            aria-hidden
            className={`h-px w-6 bg-current transition-transform duration-300 ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          />
        </button>
      </nav>

      {/* Mobile overlay menu. Explicit height: the header's backdrop-blur
          makes it the containing block for fixed children, so bottom-0
          would resolve against the 4.5rem header and collapse to nothing. */}
      <div
        id="mobile-menu"
        className={`fixed inset-x-0 top-18 h-[calc(100svh-4.5rem)] flex flex-col items-center justify-center gap-8 bg-ivory text-charcoal transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-serif text-3xl font-light tracking-wide"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="#rsvp"
          className="eyebrow mt-4 border border-charcoal/40 px-8 py-3.5"
          onClick={() => setOpen(false)}
        >
          RSVP
        </Link>
      </div>
    </header>
  );
}
