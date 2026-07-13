# PROJECT_MASTER.md — Hazel & Jhonel Wedding Platform

*Last updated: 2026-07-14. This document describes the implementation as
built in this repository and supersedes all earlier planning documentation
(including the abandoned first-generation "Ever After" invitation concept).*

---

## 1. Executive Overview

A production wedding website and RSVP platform serving the wedding of
**Hazel Jean & Jhonel Rhey** — Monday, **November 30, 2026**, 4:00 PM at
Hacienda Solange Private Events Place, Alfonso, Cavite, Philippines.

Guests visit a single elegant page: the couple's story, wedding details,
schedule, gallery, FAQs, and an RSVP form that adapts to the couple's
configuration. Responses land in Supabase. The couple manages everything —
website content, the RSVP form itself, and guest responses — through a
private, authenticated dashboard, and guests receive a designed confirmation
email when their RSVP is confirmed. The couple is notified by email the
moment a new RSVP arrives.

Although it serves one wedding, it is built as a **reusable platform**: every
wedding fact lives in the database keyed by `wedding_id`, and a deployment
serves the wedding selected by the `WEDDING_SLUG` environment variable. A
second wedding is a new database row and seed — not a rewrite.

**Status: production-complete.** All planned features are implemented,
verified, and documented.

---

## 2. Feature Inventory

Everything listed here exists in the codebase today.

### Public website (`/`)

- Hero with names, date, venue, and a live countdown (timezone-correct)
- Our Story timeline (couple-editable milestones)
- Wedding details: ceremony & reception times/venues with Google Maps
  directions links, dress code, color palette, parking note
- Schedule ("Order of the Day")
- Photo gallery with lightbox
- FAQs
- RSVP section with deadline notice
- Background music player (couple-configurable track and autoplay)
- SEO/OpenGraph metadata generated from wedding content
- Downloadable calendar event at `/calendar.ics`
- Hourly ISR + instant revalidation when the couple saves changes

### RSVP system

- Attendance choice: *Joyfully Accepts* / *Regretfully Declines*
  (decline can be disabled in configuration)
- Configurable fields: phone, guest count, plus-one, meal preference,
  dietary restrictions, song request, special message — each with
  couple-controlled visibility, requiredness, label, placeholder, and help
  text; identity fields (first/last name, email) are locked on
- Couple-managed meal options and maximum party size (1–20)
- Optional conditional plus-one (only shown when party size > 1)
- Server-side validation honoring the stored configuration; failed submits
  preserve everything the guest typed
- Duplicate protection: one RSVP per email per wedding, enforced by a
  database unique index and surfaced as a friendly message

### Couple dashboard (`/dashboard`)

- Overview: response stats (total, accepted, declined, acceptance rate,
  seats to set, pending review), countdown, five most recent responses
- Editors for wedding details, story, schedule, gallery, FAQs — all with
  add/edit/delete and drag-to-reorder where ordering matters
- RSVP form configuration page (fields, meal options, form settings)
- RSVP responses: search (`/` shortcut), attendance & status filters,
  CSV export, detail drawer, status workflow
  (`pending → confirmed / contacted`), per-response email log
- Settings: email status + test email, background music settings
- Change password page

### Authentication

- Password sign-in, magic-link sign-in, and password reset (all via
  Supabase Auth; no self-service sign-up, no account enumeration)
- Route protection in `proxy.ts` + layout re-verification + RLS +
  client-side session-expiry watcher

### Email system

- Gmail SMTP via Nodemailer with typed results and human-readable errors
- Guest confirmation email (sent once when the couple confirms an accepted
  RSVP; deliberate resend available)
- Couple notification email on every new RSVP submission (fires after the
  response; can never block or fail a guest's submission)
- Test email from the dashboard (real template, sent to the signed-in user)
- Per-RSVP tracking: status, sent-at, SMTP message id, last error
- Reusable email-safe template kit matching the site's design language
- Google Calendar link + `.ics` attachment links in the confirmation email

---

## 3. Tech Stack

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | 16.2.10 | Server Components, Server Actions, ISR, `proxy.ts`, `after()` |
| UI | React | 19.2.4 | `useActionState`, `useTransition` |
| Language | TypeScript | ^5 | Strict; zero `any` in app code |
| Styling | Tailwind CSS | v4 | CSS-first tokens in `globals.css` |
| Fonts | next/font | — | Cormorant Garamond (serif) + Inter (sans) |
| Database & Auth | Supabase | supabase-js ^2.110, @supabase/ssr ^0.12 | Postgres + RLS + Auth |
| Email | Nodemailer | ^9 | Gmail SMTP (App Password) |
| Hosting target | Vercel | — | `VERCEL_PROJECT_PRODUCTION_URL` supported out of the box |
| Dev tooling | ESLint 9, smtp-server (dev) | — | `npm run lint`; local SMTP testing |

Validation is hand-rolled and configuration-aware
(`features/rsvp/validation.ts`) — no schema library is used.

---

## 4. Folder Structure

```text
hazel-and-jhonel/
├── app/                        Routes only — thin pages that compose features
│   ├── (site)/                 Public site (+ music player layout, calendar.ics)
│   ├── auth/confirm/           Email-link landing → session
│   ├── login/
│   └── dashboard/              9 management pages + settings/password
├── components/
│   ├── dashboard/              Dashboard UI kit: shell, drawer, confirm, toast,
│   │                           save-status, session-watcher, sortable-list, ui
│   ├── ui/                     button-link, reveal, section-heading
│   └── *.tsx                   Site chrome: nav, footer, countdown, music-player
├── content/
│   ├── seed.ts                 Bundled content fallback (unconfigured envs only)
│   └── rsvp-form-defaults.ts   Default RSVP form configuration
├── features/                   One folder per section/page: actions + components
│   ├── auth/  hero/  story/  details/  schedule/  gallery/  faq/  rsvp/
│   └── dashboard/              details/ story/ schedule/ gallery/ faqs/
│                               rsvp-form/ rsvps/ settings/
├── lib/
│   ├── env.ts                  THE process.env boundary
│   ├── site-url.ts             Canonical public URL resolution
│   ├── datetime.ts  calendar.ts
│   ├── dashboard/crud.ts       Shared CRUD helpers behind every dashboard action
│   └── supabase/               server.ts (anon/admin) · server-auth.ts (cookie) · client.ts (browser)
├── services/
│   ├── wedding-service.ts      All public content reads (cached per render)
│   ├── rsvp-service.ts         Guest RSVP insert
│   ├── rsvp-admin-service.ts   Couple's RSVP reads
│   └── email/                  mailer · template-kit · templates/ · services
├── supabase/
│   ├── migrations/00001–00004  Schema, dashboard, form config, email tracking
│   └── seed.sql                Hazel & Jhonel's content
├── types/wedding.ts            Domain types shared by everything
├── proxy.ts                    Route protection (middleware successor)
└── docs/                       This documentation set
```

---

## 5. System Architecture Overview

One Next.js app, two faces, one database, one SMTP door:

```text
   Guests (anon) ──────▶  /            ISR page ── reads via anon key (RLS)
                          └─ RSVP form ── Server Action ── insert-only
                                              └─ after(): notify couple ─┐
   Couple (session) ───▶  /dashboard/** ── Server Actions ── CRUD        │
                          └─ confirm RSVP ── confirmation email ──┐      │
                                                                  ▼      ▼
   proxy.ts guards /dashboard & /login                      Nodemailer → Gmail SMTP
   RLS guards every table                                   tracking → rsvps columns
```

Principles (each explained in [ARCHITECTURE.md](ARCHITECTURE.md)):

- **RLS is the security boundary** — the browser only ever holds the anon key.
- **Server Actions, no JSON API** — every mutation is a typed function call.
- **Services own data access** — one mapping layer between rows and domain types.
- **Database enforces integrity** — duplicates, checks, and statuses are
  constraints, not conventions.
- **Side effects never break the primary action** — email failures are
  recorded, surfaced, and retryable; they never roll back a save or block a
  guest.

---

## 6. Deployment Overview

**Target: Vercel + Supabase + Gmail.**

1. **Supabase** — create a project; run `supabase/migrations/00001` → `00004`
   in order, then `supabase/seed.sql`. Create the couple's user(s) in
   Authentication (no self-sign-up exists).
2. **Environment** (see `.env.example` for the authoritative list):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required
   - `WEDDING_SLUG` — defaults to `hazel-and-jhonel`
   - `NEXT_PUBLIC_SITE_URL` — public base URL for emails/calendar links
     (falls back to Vercel's production URL, then the request origin)
   - `SMTP_HOST/PORT/SECURE/USER/PASS/FROM_NAME/FROM_EMAIL/REPLY_TO` —
     Gmail SMTP with an App Password ([EMAIL_SYSTEM.md](EMAIL_SYSTEM.md) §2)
   - `RSVP_NOTIFICATION_EMAIL` — optional override for the couple's
     notification inbox
   - `SUPABASE_SERVICE_ROLE_KEY` — optional; unused today, server-only
3. **Vercel** — standard Next.js build (`npm run build`). No custom server,
   no cron, no queues. The email side effects run inside `after()` within the
   function's lifetime.
4. **Verification** — `npx tsc --noEmit`, `npm run build`, then the smoke
   flow: submit a test RSVP, confirm it in the dashboard, check both emails.

Local development: `npm install`, copy `.env.example` → `.env.local`,
`npm run dev`. With no Supabase env vars the site renders from the bundled
seed (RSVP submission disabled with a friendly message).

---

## 7. Documentation Index

| Document | Audience | Contents |
| --- | --- | --- |
| **PROJECT_MASTER.md** (this file) | Everyone | Overview, features, stack, structure, deployment |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Engineers | Layers, App Router structure, Server Actions, auth flow, Supabase integration, request lifecycle, design decisions, extension points |
| [DATABASE.md](DATABASE.md) | Engineers | Every table, relationships, RLS policies, indexes, migrations, data flow |
| [DASHBOARD.md](DASHBOARD.md) | Engineers | Auth, navigation, every management page, CRUD/save/revalidation behavior, RSVP & email workflows |
| [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md) | Engineers / operators | SMTP + Gmail setup, mailer, template kit, all three email types, tracking, error handling, calendar integration, env vars |
| [USER_GUIDE.md](USER_GUIDE.md) | **Hazel & Jhonel** | Non-technical guide to running the website |
| [CHANGELOG.md](CHANGELOG.md) | Everyone | Version history by feature milestone |
| [CASE_STUDY.md](CASE_STUDY.md) | Portfolio readers | The story of the build: problem, challenges, architecture, bugs, lessons |

**Reading order for a new maintainer:** this file → ARCHITECTURE.md →
DATABASE.md → the doc for the area you're touching. Then the code — it is
heavily commented at every decision point.

When making changes: read the relevant doc, implement, run
`npx tsc --noEmit` + `npm run lint` + `npm run build`, verify in the browser
(guest flow *and* dashboard flow if either is affected), and update the
documentation in the same change. If documentation and implementation ever
disagree, the implementation wins — and the documentation must be corrected.
