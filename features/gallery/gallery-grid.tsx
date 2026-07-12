"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { GalleryImage } from "@/types/wedding";

interface GalleryGridProps {
  images: GalleryImage[];
}

/** Responsive photo grid with hover zoom and a keyboard-friendly lightbox. */
export function GalleryGrid({ images }: GalleryGridProps) {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setActive((current) =>
        current === null
          ? null
          : (current + dir + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, close, step]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {images.map((image, i) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className="group relative block aspect-[4/5] w-full cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              aria-label={`View photo${image.caption ? `: ${image.caption}` : ""}`}
            >
              <Image
                src={image.src}
                alt={image.caption ?? "Wedding photo"}
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/25"
              />
              {image.caption && (
                <span
                  aria-hidden
                  className="eyebrow absolute inset-x-0 bottom-5 text-center text-ivory opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                >
                  {image.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Lightbox */}
      {active !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={images[active].caption ?? "Photo"}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4 sm:p-10"
          onClick={close}
        >
          <div
            className="relative h-full max-h-[82svh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[active].src}
              alt={images[active].caption ?? "Wedding photo"}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images[active].caption && (
            <p className="eyebrow pointer-events-none absolute bottom-8 inset-x-0 text-center text-ivory/90">
              {images[active].caption}
            </p>
          )}

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-6 cursor-pointer font-serif text-4xl font-light text-ivory/80 transition-colors hover:text-ivory"
          >
            ×
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer p-3 font-serif text-4xl font-light text-ivory/70 transition-colors hover:text-ivory sm:left-6"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-3 font-serif text-4xl font-light text-ivory/70 transition-colors hover:text-ivory sm:right-6"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
