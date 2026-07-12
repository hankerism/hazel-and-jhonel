import { cache } from "react";
import {
  DEFAULT_RSVP_FORM_CONFIG,
  RSVP_FIELD_DEFAULTS,
} from "@/content/rsvp-form-defaults";
import { seedContent } from "@/content/seed";
import { env } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase/server";
import {
  LOCKED_RSVP_FIELDS,
  RSVP_FIELD_KEYS,
  type Faq,
  type GalleryImage,
  type MealOption,
  type RsvpFieldKey,
  type RsvpFormConfig,
  type ScheduleItem,
  type StoryMilestone,
  type Wedding,
  type WeddingContent,
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
  /** Added by migration 00002 — optional until it has run. */
  music_url?: string;
  music_autoplay?: boolean;
  /** Added by migration 00003 — optional until it has run. */
  rsvp_max_guests?: number;
  rsvp_allow_decline?: boolean;
  rsvp_plus_one_conditional?: boolean;
}

interface RsvpFieldRow {
  field_key: string;
  visible: boolean;
  required: boolean;
  label: string;
  placeholder: string | null;
  help_text: string | null;
}

interface MealOptionRow {
  id: string;
  label: string;
  sort_order: number;
}

interface StoryRow {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  sort_order: number;
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
    musicUrl: row.music_url ?? "/audio/bgm.mp3",
    musicAutoplay: row.music_autoplay ?? true,
  };
}

const mapStoryMilestone = (row: StoryRow): StoryMilestone => ({
  id: row.id,
  title: row.title,
  body: row.body,
  imageUrl: row.image_url,
  sortOrder: row.sort_order,
});

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

/** Stored field rows + settings columns over the defaults. Locked identity
 * fields stay visible+required no matter what reaches the database. */
function buildRsvpConfig(
  wedding: WeddingRow,
  fieldRows: RsvpFieldRow[] | null,
  mealRows: MealOptionRow[] | null,
): RsvpFormConfig {
  const byKey = new Map((fieldRows ?? []).map((r) => [r.field_key, r]));

  const fields = Object.fromEntries(
    RSVP_FIELD_KEYS.map((key) => {
      const stored = byKey.get(key);
      const base = RSVP_FIELD_DEFAULTS[key];
      const locked = LOCKED_RSVP_FIELDS.includes(key);
      return [
        key,
        stored
          ? {
              key,
              visible: locked || stored.visible,
              required: locked || stored.required,
              label: stored.label || base.label,
              placeholder: stored.placeholder,
              helpText: stored.help_text,
            }
          : base,
      ];
    }),
  ) as Record<RsvpFieldKey, (typeof RSVP_FIELD_DEFAULTS)[RsvpFieldKey]>;

  const mealOptions: MealOption[] = mealRows
    ? mealRows.map((r) => ({ id: r.id, label: r.label, sortOrder: r.sort_order }))
    : DEFAULT_RSVP_FORM_CONFIG.mealOptions;

  return {
    fields,
    mealOptions,
    maxGuests: wedding.rsvp_max_guests ?? DEFAULT_RSVP_FORM_CONFIG.maxGuests,
    allowDecline:
      wedding.rsvp_allow_decline ?? DEFAULT_RSVP_FORM_CONFIG.allowDecline,
    plusOneConditional:
      wedding.rsvp_plus_one_conditional ??
      DEFAULT_RSVP_FORM_CONFIG.plusOneConditional,
  };
}

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

  const [story, schedule, gallery, faqs, rsvpFields, mealOptions] = await Promise.all([
    // story_milestones arrives with migration 00002; fall back to the seed
    // copy until it exists so the public site never breaks.
    supabase
      .from("story_milestones")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("sort_order")
      .then(({ data, error }) =>
        error || !data ? null : (data as StoryRow[]),
      ),
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
    // Both arrive with migration 00003 — null (→ defaults) until then.
    supabase
      .from("rsvp_form_fields")
      .select("*")
      .eq("wedding_id", wedding.id)
      .then(({ data, error }) =>
        error || !data ? null : (data as RsvpFieldRow[]),
      ),
    supabase
      .from("meal_options")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("sort_order")
      .then(({ data, error }) =>
        error || !data ? null : (data as MealOptionRow[]),
      ),
  ]);

  return {
    wedding: mapWedding(wedding),
    story: story ? story.map(mapStoryMilestone) : seedContent.story,
    schedule: schedule.map(mapSchedule),
    gallery: gallery.map(mapGalleryImage),
    faqs: faqs.map(mapFaq),
    rsvpConfig: buildRsvpConfig(wedding, rsvpFields, mealOptions),
  };
});
