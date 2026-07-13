# DATABASE.md — Supabase Schema Reference

*Synchronized with the implementation as of 2026-07-14 (migrations `00001`–`00004`).*

The platform stores everything in a single Supabase (PostgreSQL) project. The
schema is **multi-wedding by design**: every content table hangs off
`weddings.id`, and a deployment serves the wedding selected by the
`WEDDING_SLUG` environment variable. Row Level Security is the security
boundary — the application ships only the public anon key.

---

## 1. Entity Overview

```text
                              ┌──────────────────┐
                              │     weddings     │
                              │  (1 row per      │
                              │   deployment)    │
                              └────────┬─────────┘
                                       │ wedding_id (FK, on delete cascade)
        ┌──────────────┬───────────────┼───────────────┬──────────────┬─────────────┐
        │              │               │               │              │             │
┌───────▼──────┐ ┌─────▼────────┐ ┌────▼─────┐ ┌───────▼──────┐ ┌─────▼──────┐ ┌────▼─────────────┐
│ story_       │ │ schedule_    │ │ gallery_ │ │    faqs      │ │   rsvps    │ │ rsvp_form_fields │
│ milestones   │ │ items        │ │ images   │ │              │ │            │ │ + meal_options   │
│ (00002)      │ │ (00001)      │ │ (00001)  │ │  (00001)     │ │  (00001)   │ │     (00003)      │
└──────────────┘ └──────────────┘ └──────────┘ └──────────────┘ └────────────┘ └──────────────────┘
   couple's         order of         photo         Q&A            guest          per-field form
   love story       the day          grid          section        responses      configuration
```

All relationships are one-to-many from `weddings`, all foreign keys are
`on delete cascade`, and there are no join tables — the model is deliberately
flat.

---

## 2. Tables

### 2.1 `weddings` — the root aggregate

One row per wedding. Holds every "wedding fact" plus form-level RSVP settings
and music settings that later migrations added as columns.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `slug` | `text` | `not null unique` | Deployment selector (`WEDDING_SLUG`) |
| `bride_name` / `groom_name` | `text` | `not null` | |
| `wedding_date` | `date` | `not null` | |
| `ceremony_time` / `reception_time` | `time` | `not null` | Naive local time |
| `timezone` | `text` | default `'Asia/Manila'` | IANA name; date math happens app-side |
| `ceremony_venue` / `reception_venue` | `text` | `not null` | |
| `ceremony_address` / `reception_address` | `text` | `not null` | Newline-separated lines; the service splits into `string[]` |
| `rsvp_deadline` | `date` | `not null` | Display only — submissions are not blocked after it |
| `dress_code` | `text` | default `''` | |
| `wedding_colors` | `text[]` | default `'{}'` | Comma-separated in the dashboard form |
| `parking_note` | `text` | default `''` | |
| `welcome_message` | `text` | default `''` | Also used as calendar-event description and SEO description |
| `hero_image` | `text` | default `''` | URL or site-relative path; also the confirmation email hero and OG image |
| `music_url` | `text` | default `'/audio/bgm.mp3'` *(00002)* | |
| `music_autoplay` | `boolean` | default `true` *(00002)* | |
| `rsvp_max_guests` | `integer` | default `10`, `check between 1 and 20` *(00003)* | |
| `rsvp_allow_decline` | `boolean` | default `true` *(00003)* | |
| `rsvp_plus_one_conditional` | `boolean` | default `false` *(00003)* | Show plus-one only when party size > 1 |
| `created_at` / `updated_at` | `timestamptz` | `now()` | `updated_at` maintained by trigger |

### 2.2 `rsvps` — guest responses

The busiest table: inserted by anonymous guests, read and updated by the
signed-in couple, and carrying the email-tracking audit trail.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `wedding_id` | `uuid` | FK → `weddings`, cascade | |
| `first_name` / `last_name` | `text` | `not null` | Identity fields — always required by the form |
| `email` | `text` | `not null` | Stored lowercased by the service |
| `phone` | `text` | `not null` | May be `''` (optional in the form) |
| `attendance` | `text` | `check in ('attending','declining')` | |
| `guest_count` | `integer` | default `1`, `check between 0 and 20` | `0` when the guest declines; ceiling widened by 00003 |
| `plus_one_name` | `text` | nullable | |
| `meal_preference` | `text` | nullable | Validated app-side against `meal_options` |
| `dietary_restrictions` | `text` | nullable | |
| `song_request` | `text` | nullable | |
| `message` | `text` | nullable | |
| `status` | `text` | default `'pending'`, `check in ('pending','confirmed','contacted')` | Workflow column; 00002 replaced the original `'archived'` with `'contacted'` |
| `confirmation_email_status` | `text` | `null` or `check in ('sent','failed')` *(00004)* | `null` = never attempted |
| `confirmation_email_sent_at` | `timestamptz` | nullable *(00004)* | |
| `confirmation_email_message_id` | `text` | nullable *(00004)* | SMTP message id, shown in the dashboard drawer |
| `confirmation_email_error` | `text` | nullable *(00004)* | Last failure, human-readable |
| `created_at` / `updated_at` | `timestamptz` | `now()` | `created_at` doubles as "Submitted" time |

**Key indexes**

```sql
-- One RSVP per email per wedding; duplicate submissions are rejected
-- at the database, not just in application code.
create unique index rsvps_wedding_email_key
  on public.rsvps (wedding_id, lower(email));

-- Dashboard list: newest first.
create index rsvps_wedding_idx on public.rsvps (wedding_id, created_at desc);
```

The unique index is the duplicate-prevention mechanism: the insert fails with
Postgres error `23505`, which `services/rsvp-service.ts` translates into the
guest-facing "You're already on our list" state.

### 2.3 Content tables

All four share the same shape: FK to `weddings`, an ordering column, and
timestamps. Ordered indexes exist on `(wedding_id, <order column>)`.

| Table | Migration | Ordering column | Content columns |
| --- | --- | --- | --- |
| `schedule_items` | 00001 | `sort_order` | `event_time time`, `title`, `description?` |
| `gallery_images` | 00001 | `display_order` | `image_url`, `caption?` |
| `faqs` | 00001 | `display_order` | `question`, `answer` |
| `story_milestones` | 00002 | `sort_order` | `title`, `body`, `image_url?` |

### 2.4 RSVP form configuration tables *(00003)*

| Table | Purpose |
| --- | --- |
| `meal_options` | Couple-managed menu (`label`, `sort_order`). Guests' `meal_preference` must match one of these labels (enforced app-side). |
| `rsvp_form_fields` | One row per **customized** field: `field_key` (checked against the 10 known keys), `visible`, `required`, `label`, `placeholder?`, `help_text?`. `unique (wedding_id, field_key)` backs the dashboard's upsert. |

`rsvp_form_fields` starts empty by design: absent rows fall back to the
application defaults in `content/rsvp-form-defaults.ts`, so an untouched
install renders exactly the originally designed form. The three identity keys
(`firstName`, `lastName`, `email`) are *locked* — the app forces them
visible + required regardless of what reaches the database (enforced both when
saving config and when building the effective config).

---

## 3. Row Level Security

RLS is enabled on **every** table. There are two actors:

| Actor | Key | Can |
| --- | --- | --- |
| Guest (anonymous) | anon key | **Read** all content tables; **insert** into `rsvps`. Nothing else. |
| Couple (authenticated) | anon key + Supabase Auth session | Everything guests can, plus **manage** all content tables and **read/update** `rsvps`. |

Policy summary (00001 + 00002 + 00003):

```text
weddings, schedule_items, gallery_images,     select  → anon, authenticated
faqs, story_milestones, meal_options,
rsvp_form_fields

same tables                                   all     → authenticated

rsvps                                         insert  → anon, authenticated
rsvps                                         select  → authenticated
rsvps                                         update  → authenticated
```

Three deliberate properties:

1. **Guests can never read RSVPs.** The anon role has insert-only access, so
   even a leaked anon key cannot enumerate responses.
2. **There is no delete policy on `rsvps`** — for anyone. Responses are a
   record; the couple manages them through `status`, never by deletion.
3. **Authenticated = full access** (single-tenant assumption). Migration
   00002 documents the multi-wedding caveat in-line: before onboarding a
   second couple, add an ownership table (e.g.
   `wedding_members(wedding_id, user_id)`) and scope the authenticated
   policies to it.

A side effect worth knowing when debugging: RLS **silently filters** rows it
won't let you touch. An update that matches zero visible rows reports
success with `count = 0` rather than erroring — which is why
`lib/dashboard/crud.ts` requests `{ count: "exact" }` and treats `count === 0`
as a failure with a migration hint.

The `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) is read by
`getSupabaseAdminClient()` in `lib/supabase/server.ts`, but **no production
code path calls it today** — it is reserved for future admin tooling.

---

## 4. Migrations

Files live in `supabase/migrations/` and are applied in order (SQL editor or
`supabase db push`). They are written to be safe on a live database:
`add column if not exists`, guarded seed inserts, `drop constraint if exists`
before re-adding.

| File | Adds |
| --- | --- |
| `00001_initial_schema.sql` | `weddings`, `schedule_items`, `gallery_images`, `faqs`, `rsvps`; the `set_updated_at()` trigger function + one trigger per table; anon RLS policies; the duplicate-email unique index. |
| `00002_dashboard.sql` | `story_milestones` (+ default milestones for the existing wedding); `music_url` / `music_autoplay` on `weddings`; replaces the `'archived'` RSVP status with `'contacted'`; **all authenticated RLS policies**. |
| `00003_rsvp_form_config.sql` | `meal_options` (+ current menu for the existing wedding), `rsvp_form_fields`; form-level settings columns on `weddings`; widens `guest_count` check from 0–10 to 0–20. |
| `00004_email_system.sql` | The four `confirmation_email_*` tracking columns on `rsvps` and their status check. Touches no data. |

Companion files:

- `supabase/seed.sql` — Hazel & Jhonel's content (wedding row with fixed UUID
  `…0001`, schedule, gallery, story). Fresh installs run it after 00001.
- `supabase/cleanup-ever-after.sql` — one-time removal script for the tables
  of the abandoned first-generation build ("Ever After"); kept for reference,
  not part of setup.

**Migration-resilient application code.** The services treat post-00001
tables/columns as optional: `wedding-service.ts` falls back to seed story
content or config defaults when 00002/00003 objects are missing, and
`rsvp-admin-service.ts` defaults the 00004 tracking columns to `null`. The
dashboard's CRUD layer maps "missing table/column" Postgres and PostgREST
errors (`42P01`, `42703`, `PGRST204`, `PGRST205`) to a human hint telling the
operator to run the latest migrations. The app therefore degrades politely on
a database that is one migration behind instead of crashing.

---

## 5. Data Flow

### Reads (public site)

```text
guest request → app/(site)/page.tsx  (ISR, revalidate = 3600)
                  └─ getWeddingContent()          [React cache(): 1 DB pass/render]
                       ├─ weddings  (by slug = WEDDING_SLUG)
                       └─ story, schedule, gallery, faqs,
                          rsvp_form_fields, meal_options   (parallel, by wedding_id)
```

Supabase is the source of truth. Only when the two public env vars are
*entirely absent* (fresh clone, CI) does the service serve the bundled seed
from `content/seed.ts`, with a loud console warning. A configured-but-failing
Supabase **throws** — stale seed content must never silently impersonate real
data.

### Writes

| Path | Client | RLS role |
| --- | --- | --- |
| Guest submits RSVP | `getSupabaseClient()` (anon, no session) | `anon` — insert only |
| Couple edits content / RSVP status / email tracking | `getSupabaseAuthClient()` (cookie session) | `authenticated` |

Every dashboard write is followed by `revalidatePath("/")` (plus the dashboard
page that changed), so saves reach the ISR-cached public page immediately
instead of waiting out the hourly window.

### Naming boundary

Database rows are `snake_case`; the application's domain types
(`types/wedding.ts`) are `camelCase`. The mapping happens in exactly one
layer — `services/` — so no component ever sees a raw row shape.
