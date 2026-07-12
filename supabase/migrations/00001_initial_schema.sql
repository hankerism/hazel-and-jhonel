-- Wedding platform: initial schema
-- Multi-wedding by design; every content table hangs off weddings.id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- weddings

create table public.weddings (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  bride_name        text not null,
  groom_name        text not null,
  wedding_date      date not null,
  ceremony_time     time not null,
  timezone          text not null default 'Asia/Manila',
  ceremony_venue    text not null,
  ceremony_address  text not null,
  reception_time    time not null,
  reception_venue   text not null,
  reception_address text not null,
  rsvp_deadline     date not null,
  dress_code        text not null default '',
  wedding_colors    text[] not null default '{}',
  parking_note      text not null default '',
  welcome_message   text not null default '',
  hero_image        text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------- schedule_items

create table public.schedule_items (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings (id) on delete cascade,
  event_time  time not null,
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index schedule_items_wedding_idx
  on public.schedule_items (wedding_id, sort_order);

-- ---------------------------------------------------------- gallery_images

create table public.gallery_images (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid not null references public.weddings (id) on delete cascade,
  image_url     text not null,
  caption       text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index gallery_images_wedding_idx
  on public.gallery_images (wedding_id, display_order);

-- ------------------------------------------------------------------- faqs

create table public.faqs (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid not null references public.weddings (id) on delete cascade,
  question      text not null,
  answer        text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index faqs_wedding_idx on public.faqs (wedding_id, display_order);

-- ------------------------------------------------------------------ rsvps

create table public.rsvps (
  id                   uuid primary key default gen_random_uuid(),
  wedding_id           uuid not null references public.weddings (id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  first_name           text not null,
  last_name            text not null,
  email                text not null,
  phone                text not null,
  attendance           text not null check (attendance in ('attending', 'declining')),
  -- 0 when the guest declines
  guest_count          integer not null default 1 check (guest_count between 0 and 10),
  plus_one_name        text,
  meal_preference      text,
  dietary_restrictions text,
  song_request         text,
  message              text,
  status               text not null default 'pending'
                       check (status in ('pending', 'confirmed', 'archived'))
);

-- One RSVP per email per wedding: duplicate submissions are rejected.
create unique index rsvps_wedding_email_key
  on public.rsvps (wedding_id, lower(email));

create index rsvps_wedding_idx on public.rsvps (wedding_id, created_at desc);

-- ------------------------------------------------------- updated_at trigger

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger weddings_set_updated_at
  before update on public.weddings
  for each row execute function public.set_updated_at();

create trigger schedule_items_set_updated_at
  before update on public.schedule_items
  for each row execute function public.set_updated_at();

create trigger gallery_images_set_updated_at
  before update on public.gallery_images
  for each row execute function public.set_updated_at();

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

create trigger rsvps_set_updated_at
  before update on public.rsvps
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------- Row Level Security
-- Anonymous visitors may read public content and submit an RSVP — nothing
-- else. Admin access (the future /admin dashboard) will use authenticated
-- roles; the service role key is never shipped to the app.

alter table public.weddings       enable row level security;
alter table public.schedule_items enable row level security;
alter table public.gallery_images enable row level security;
alter table public.faqs           enable row level security;
alter table public.rsvps          enable row level security;

create policy "Public can read weddings"
  on public.weddings for select
  to anon, authenticated
  using (true);

create policy "Public can read schedule"
  on public.schedule_items for select
  to anon, authenticated
  using (true);

create policy "Public can read gallery"
  on public.gallery_images for select
  to anon, authenticated
  using (true);

create policy "Public can read faqs"
  on public.faqs for select
  to anon, authenticated
  using (true);

-- Guests can submit an RSVP but never read, update, or delete them.
create policy "Anyone can submit an RSVP"
  on public.rsvps for insert
  to anon, authenticated
  with check (true);
