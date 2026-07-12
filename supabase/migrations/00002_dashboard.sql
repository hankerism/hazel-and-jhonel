-- ============================================================================
-- Migration 00002: Couple Dashboard (Phase 2)
--
-- Adds: story_milestones table, music settings on weddings, the 'contacted'
-- RSVP status, and RLS policies allowing AUTHENTICATED users (the couple)
-- to manage wedding content and read/update RSVPs.
--
-- Run AFTER 00001_initial_schema.sql (+ seed.sql). Idempotence: guarded
-- where practical; intended to run once.
-- ============================================================================

-- --------------------------------------------------------- story_milestones

create table public.story_milestones (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  image_url  text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index story_milestones_wedding_idx
  on public.story_milestones (wedding_id, sort_order);

create trigger story_milestones_set_updated_at
  before update on public.story_milestones
  for each row execute function public.set_updated_at();

alter table public.story_milestones enable row level security;

create policy "Public can read story"
  on public.story_milestones for select
  to anon, authenticated
  using (true);

-- Default milestones for the existing wedding (mirrors the site's copy).
insert into public.story_milestones (wedding_id, title, body, sort_order)
select w.id, m.title, m.body, m.sort_order
from public.weddings w
cross join (values
  ('How We Met',
   'Two paths crossed at just the right moment, and a conversation that was never meant to end — didn''t.', 1),
  ('The Proposal',
   'One quiet, perfect question. One joyful, certain yes. And everything after became ours to plan together.', 2),
  ('See You At The Wedding',
   'The best chapter is the one we write next — and it begins with you there beside us.', 3)
) as m(title, body, sort_order)
where w.slug = 'hazel-and-jhonel'
  and not exists (
    select 1 from public.story_milestones s where s.wedding_id = w.id
  );

-- ------------------------------------------------------------ music settings

alter table public.weddings
  add column if not exists music_url text not null default '/audio/bgm.mp3',
  add column if not exists music_autoplay boolean not null default true;

-- ------------------------------------------------------------- rsvp statuses

-- Dashboard workflow: pending → confirmed / contacted.
alter table public.rsvps drop constraint if exists rsvps_status_check;
alter table public.rsvps
  add constraint rsvps_status_check
  check (status in ('pending', 'confirmed', 'contacted'));

-- ------------------------------------------------- authenticated RLS policies
-- The couple signs in via Supabase Auth; authenticated users manage content.
-- NOTE for multi-wedding future: these grant every authenticated user access
-- to every wedding. Before onboarding a second couple, add an ownership
-- mapping (e.g. wedding_members(wedding_id, user_id)) and scope these
-- policies to it.

create policy "Authenticated can manage weddings"
  on public.weddings for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated can manage schedule"
  on public.schedule_items for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated can manage gallery"
  on public.gallery_images for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated can manage faqs"
  on public.faqs for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated can manage story"
  on public.story_milestones for all
  to authenticated
  using (true) with check (true);

-- RSVPs: the couple can read and update (status changes); guests still
-- insert-only. Deliberately no delete policy — responses are a record.
create policy "Authenticated can read rsvps"
  on public.rsvps for select
  to authenticated
  using (true);

create policy "Authenticated can update rsvps"
  on public.rsvps for update
  to authenticated
  using (true) with check (true);
