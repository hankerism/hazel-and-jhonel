-- ============================================================================
-- Migration 00003: Configurable RSVP form
--
-- Adds: per-field RSVP form configuration, meal options (couple-managed,
-- ordered), and form-level settings on weddings. Run AFTER 00002.
-- ============================================================================

-- ------------------------------------------------------------- meal_options

create table public.meal_options (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_options_wedding_idx
  on public.meal_options (wedding_id, sort_order);

create trigger meal_options_set_updated_at
  before update on public.meal_options
  for each row execute function public.set_updated_at();

alter table public.meal_options enable row level security;

create policy "Public can read meal options"
  on public.meal_options for select
  to anon, authenticated
  using (true);

create policy "Authenticated can manage meal options"
  on public.meal_options for all
  to authenticated
  using (true) with check (true);

-- Current menu for the existing wedding (fresh installs seed via seed.sql).
insert into public.meal_options (wedding_id, label, sort_order)
select w.id, m.label, m.sort_order
from public.weddings w
cross join (values
  ('Beef', 1), ('Chicken', 2), ('Fish', 3), ('Vegetarian', 4)
) as m(label, sort_order)
where w.slug = 'hazel-and-jhonel'
  and not exists (
    select 1 from public.meal_options o where o.wedding_id = w.id
  );

-- -------------------------------------------------------- rsvp_form_fields
-- One row per configured field. Absent rows fall back to the application's
-- defaults, so this table starts empty and fills as the couple customizes.

create table public.rsvp_form_fields (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings (id) on delete cascade,
  field_key   text not null check (field_key in (
    'firstName', 'lastName', 'email', 'phone', 'guestCount', 'plusOneName',
    'mealPreference', 'dietaryRestrictions', 'songRequest', 'message'
  )),
  visible     boolean not null default true,
  required    boolean not null default false,
  label       text not null,
  placeholder text,
  help_text   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (wedding_id, field_key)
);

create trigger rsvp_form_fields_set_updated_at
  before update on public.rsvp_form_fields
  for each row execute function public.set_updated_at();

alter table public.rsvp_form_fields enable row level security;

-- Guests need the config to render the form.
create policy "Public can read rsvp form fields"
  on public.rsvp_form_fields for select
  to anon, authenticated
  using (true);

create policy "Authenticated can manage rsvp form fields"
  on public.rsvp_form_fields for all
  to authenticated
  using (true) with check (true);

-- --------------------------------------------------- form-level settings

alter table public.weddings
  add column if not exists rsvp_max_guests integer not null default 10
    check (rsvp_max_guests between 1 and 20),
  add column if not exists rsvp_allow_decline boolean not null default true,
  add column if not exists rsvp_plus_one_conditional boolean not null default false;

-- Guest counts are bounded by configuration now; widen the hard DB ceiling
-- to the settings maximum (0 stays valid for declines).
alter table public.rsvps drop constraint if exists rsvps_guest_count_check;
alter table public.rsvps
  add constraint rsvps_guest_count_check check (guest_count between 0 and 20);
