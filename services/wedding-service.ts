import { cache } from "react";
import { seedContent } from "@/content/seed";
import { env } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase/server";
import type {
  Faq,
  GalleryImage,
  ScheduleItem,
  Wedding,
  WeddingContent,
} from "@/types/wedding";

/* Database row shapes (snake_case, as stored in Supabase). */

interface WeddingRow {
  id: string;
  slug: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  ceremony_time: string;
  timezone: string;
  ceremony_venue: string;
  ceremony_address: string;
  reception_time: string;
  reception_venue: string;
  reception_address: string;
  rsvp_deadline: string;
  dress_code: string;
  wedding_colors: string[];
  parking_note: string;
  welcome_message: string;
  hero_image: string;
}

interface ScheduleRow {
  id: string;
  event_time: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface GalleryRow {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

const splitAddress = (address: string): string[] =>
  address.split("\n").map((line) => line.trim()).filter(Boolean);

/** "16:00:00" (Postgres time) → "16:00" */
const toHhMm = (time: string): string => time.slice(0, 5);

function mapWedding(row: WeddingRow): Wedding {
  return {
    id: row.id,
    slug: row.slug,
    brideName: row.bride_name,
    groomName: row.groom_name,
    weddingDate: row.wedding_date,
    ceremonyTime: toHhMm(row.ceremony_time),
    timezone: row.timezone,
    ceremonyVenue: row.ceremony_venue,
    ceremonyAddress: splitAddress(row.ceremony_address),
    receptionTime: toHhMm(row.reception_time),
    receptionVenue: row.reception_venue,
    receptionAddress: splitAddress(row.reception_address),
    rsvpDeadline: row.rsvp_deadline,
    dressCode: row.dress_code,
    weddingColors: row.wedding_colors,
    parkingNote: row.parking_note,
    welcomeMessage: row.welcome_message,
    heroImage: row.hero_image,
  };
}

const mapSchedule = (row: ScheduleRow): ScheduleItem => ({
  id: row.id,
  time: toHhMm(row.event_time),
  title: row.title,
  description: row.description,
  sortOrder: row.sort_order,
});

const mapGalleryImage = (row: GalleryRow): GalleryImage => ({
  id: row.id,
  src: row.image_url,
  caption: row.caption,
  displayOrder: row.display_order,
});

const mapFaq = (row: FaqRow): Faq => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  displayOrder: row.display_order,
});

/**
 * Fetch all public content for the configured wedding from Supabase.
 *
 * Supabase is the source of truth. Only when it is entirely unconfigured
 * (no env vars — fresh clone, CI without secrets) does this serve the
 * bundled seed, with a loud warning. A configured-but-failing Supabase
 * throws rather than silently masking the problem with stale seed data.
 * Wrapped in React cache() so a render pass hits the database once.
 */
export const getWeddingContent = cache(async (): Promise<WeddingContent> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      "[wedding-service] SUPABASE NOT CONFIGURED — serving bundled seed " +
        "content. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "to load real data.",
    );
    return seedContent;
  }

  const { data: wedding, error } = await supabase
    .from("weddings")
    .select("*")
    .eq("slug", env.weddingSlug)
    .single<WeddingRow>();

  if (error || !wedding) {
    throw new Error(
      `[wedding-service] failed to load wedding "${env.weddingSlug}" from Supabase: ` +
        (error?.message ?? "no row found — has seed.sql been run?"),
    );
  }

  const [schedule, gallery, faqs] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("sort_order")
      .then(({ data }) => (data as ScheduleRow[] | null) ?? []),
    supabase
      .from("gallery_images")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("display_order")
      .then(({ data }) => (data as GalleryRow[] | null) ?? []),
    supabase
      .from("faqs")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("display_order")
      .then(({ data }) => (data as FaqRow[] | null) ?? []),
  ]);

  return {
    wedding: mapWedding(wedding),
    schedule: schedule.map(mapSchedule),
    gallery: gallery.map(mapGalleryImage),
    faqs: faqs.map(mapFaq),
  };
});
