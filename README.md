# Hazel Jean & Jhonel Rhey — Wedding RSVP

A premium wedding RSVP website. Built as a reusable platform: all wedding
content lives in Supabase, and this deployment serves the wedding selected
by `WEDDING_SLUG`.

**Monday, November 30, 2026 · Hacienda Solange Private Events Place, Alfonso, Cavite**

## Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- TypeScript · Tailwind CSS v4
- Supabase (Postgres + RLS)

## Setup

### 1. Database

In the Supabase Dashboard → SQL Editor, run in order:

1. `supabase/migrations/00001_initial_schema.sql` — core tables, indexes,
   constraints, triggers, Row Level Security
2. `supabase/migrations/00002_dashboard.sql` — story milestones, music
   settings, RSVP statuses, authenticated RLS policies
3. `supabase/migrations/00003_rsvp_form_config.sql` — configurable RSVP
   form fields, meal options, form settings
4. `supabase/migrations/00004_email_system.sql` — confirmation-email
   tracking columns
5. `supabase/seed.sql` — Hazel & Jhonel's wedding content (references
   tables from 00002/00003, so it must run **after** all migrations)

(Or with the CLI: `supabase link`, then `supabase db push`, then run the
seed.)

### 2. Environment

Copy `.env.example` to `.env.local` and fill in from Supabase Dashboard →
Settings → API:

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | required — project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required — public anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | optional — server-only, reserved for future admin tooling (unused by the app today) |
| `WEDDING_SLUG` | which `weddings.slug` this deployment serves (default `hazel-and-jhonel`) |
| `NEXT_PUBLIC_SITE_URL` | public base URL used in emails and calendar links (production: the deployed URL; falls back to the request origin) |
| `SMTP_*` | Gmail SMTP for confirmation + notification emails — see `.env.example` (server-side only; for Gmail use an App Password, not the account password) |
| `RSVP_NOTIFICATION_EMAIL` | optional — where "New RSVP received" notifications go (defaults to the couple's inbox, resolved in `services/email/notification-service.ts`) |

Set the same variables in Vercel → Project → Settings → Environment
Variables for deployments.

### 3. Run

```bash
npm install
npm run dev
```

**Data behavior:** Supabase is the source of truth. If the two public env
vars are missing entirely (fresh clone, CI without secrets), page content
falls back to the bundled seed in `content/seed.ts` with a console warning —
but RSVP submissions require Supabase and will show guests a friendly error
until it is configured. A configured-but-unreachable Supabase fails loudly
rather than serving stale content.

## Security model

The app ships only the anon key. RLS limits anonymous access to reading
public content (`weddings`, `schedule_items`, `gallery_images`, `faqs`,
`story_milestones`, `meal_options`, `rsvp_form_fields`) and **inserting**
into `rsvps` — guests can never read, update, or delete responses. The
couple signs in via Supabase Auth; authenticated users manage content and
read/update RSVPs (no delete policy exists — responses are a record).
Duplicate RSVPs are blocked by a unique index on
`(wedding_id, lower(email))`. The service role key bypasses RLS and must
never be exposed to the browser.

## Architecture

| Layer | Path | Role |
| --- | --- | --- |
| Types | `types/` | Domain shapes shared by UI and services |
| Services | `services/` | Supabase data access; maps rows → domain types |
| Features | `features/` | Page sections, one folder per section |
| Components | `components/` | Site chrome and reusable UI primitives |
| Supabase | `lib/supabase/` | `server.ts` (anon + admin clients), `client.ts` (browser) |
| Database | `supabase/` | Schema migration (with RLS) and seed |

Server Components everywhere; client components only where interaction
demands it (nav, countdown, gallery lightbox, RSVP form, scroll reveals).
The page revalidates hourly (ISR), so content edited in Supabase reaches
guests without a redeploy.

The couple manages everything through the authenticated dashboard at
`/dashboard`: content editors, RSVP form configuration, response review
with a `pending → confirmed / contacted` workflow, and the email system
(guest confirmations, new-RSVP notifications, test sends). Everything is
keyed by `wedding_id`, so a second wedding is a new row and seed — not a
fork.

## Documentation

The full engineering documentation set lives in [`docs/`](docs/):
[PROJECT_MASTER](docs/PROJECT_MASTER.md) (start here) ·
[ARCHITECTURE](docs/ARCHITECTURE.md) · [DATABASE](docs/DATABASE.md) ·
[DASHBOARD](docs/DASHBOARD.md) · [EMAIL_SYSTEM](docs/EMAIL_SYSTEM.md) ·
[USER_GUIDE](docs/USER_GUIDE.md) (for the couple) ·
[CHANGELOG](docs/CHANGELOG.md) · [CASE_STUDY](docs/CASE_STUDY.md)
