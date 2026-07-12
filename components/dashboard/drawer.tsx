"use client";

import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Right-side sheet used for record detail (RSVP responses). */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="fade-slide-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-ivory shadow-[-20px_0_60px_rgba(26,24,21,0.15)]"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-serif text-xl font-light">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer p-1 font-serif text-2xl font-light text-stone transition-colors hover:text-charcoal"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}
