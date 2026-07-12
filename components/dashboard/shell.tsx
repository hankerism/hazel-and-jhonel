"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useConfirm } from "./confirm";
import { SaveStatusIndicator } from "./save-status";
import { SessionWatcher } from "./session-watcher";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/details", label: "Wedding Details" },
  { href: "/dashboard/story", label: "Story" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/gallery", label: "Gallery" },
  { href: "/dashboard/faqs", label: "FAQs" },
  { href: "/dashboard/rsvp-form", label: "RSVP Form" },
  { href: "/dashboard/rsvps", label: "RSVP Responses" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

interface ShellProps {
  coupleNames: string;
  monogram: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}

export function DashboardShell({
  coupleNames,
  monogram,
  userEmail,
  signOutAction,
  children,
}: ShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const confirm = useConfirm();
  const [signingOut, startSignOut] = useTransition();

  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: "Sign out?",
      body: "You'll need your password or an email link to get back in.",
      confirmLabel: "Sign Out",
    });
    if (confirmed) startSignOut(() => signOutAction());
  };

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl px-3.5 py-2 text-[0.8125rem] transition-colors duration-200 ${
              active
                ? "border border-line bg-white/80 font-medium text-charcoal shadow-[0_2px_10px_rgba(26,24,21,0.05)]"
                : "text-stone hover:bg-white/50 hover:text-charcoal"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-svh bg-parchment">
      <SessionWatcher />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-line bg-ivory/70 px-4 py-6 backdrop-blur-sm md:flex">
        <Link
          href="/"
          className="mb-8 px-3.5 font-serif text-2xl tracking-[0.18em]"
          title="View public website"
        >
          {monogram}
        </Link>
        {nav()}
        <p className="mt-auto px-3.5 text-[0.6875rem] leading-relaxed text-stone">
          Changes publish to the live website when saved.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-ivory/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-line md:hidden"
            >
              <span aria-hidden className={`h-px w-4 bg-current transition-transform ${menuOpen ? "translate-y-[2.5px] rotate-45" : ""}`} />
              <span aria-hidden className={`h-px w-4 bg-current transition-transform ${menuOpen ? "-translate-y-[2.5px] -rotate-45" : ""}`} />
            </button>
            <span className="font-serif text-lg font-light tracking-wide">
              {coupleNames}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <SaveStatusIndicator />
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <span className="hidden max-w-40 truncate text-xs text-stone sm:block">
                {userEmail}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="eyebrow cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-[0.5625rem] transition-colors hover:border-charcoal/40 disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav panel */}
        {menuOpen && (
          <div className="border-b border-line bg-ivory/95 px-4 py-4 backdrop-blur-md md:hidden">
            {nav(() => setMenuOpen(false))}
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
