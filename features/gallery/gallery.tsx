import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { GalleryImage } from "@/types/wedding";
import { GalleryGrid } from "./gallery-grid";

interface GalleryProps {
  images: GalleryImage[];
}

export function Gallery({ images }: GalleryProps) {
  return (
    <section id="gallery" className="bg-parchment px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Gallery" title="Moments We Treasure" />
        <Reveal className="mt-16 sm:mt-20">
          <GalleryGrid images={images} />
        </Reveal>
      </div>
    </section>
  );
}
