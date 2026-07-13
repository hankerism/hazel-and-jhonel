# ARCHITECTURE.md — System Architecture

*Synchronized with the implementation as of 2026-07-14.*

This document explains how the application is put together and, more
importantly, *why* it is put together that way. For the schema itself see
[DATABASE.md](DATABASE.md); for the email subsystem see
[EMAIL_SYSTEM.md](EMAIL_SYSTEM.md).

---

## 1. High-Level Architecture

The system is a single Next.js 16 application with two faces sharing one
Supabase database:

```text
                    ┌─────────────────────────────────────────────────┐
                    │                 Next.js 16 app                  │
                    │                                                 │
  Guests ──────────▶│  Public site  /            (ISR, anon reads)    │
  (anonymous)       │    └─ RSVP form ── Server Action ── insert      │
                    │                                                 │
  Hazel & Jhonel ──▶│  Dashboard    /dashboard/** (dynamic, session)  │
  (authenticated)   │    └─ 9 pages ── Server Actions ── CRUD         │
                    │                                                 │
                    │  proxy.ts — session refresh + route guard       │
                    └───────┬─────────────────────────┬───────────────┘
                            │ anon key (RLS)          │ SMTP (Gmail)
                    ┌───────▼───────┐         ┌───────▼───────┐
                    │   Supabase    │         │  Nodemailer   │
                    │ Postgres+Auth │         │  smtp.gmail   │
                    └───────────────┘         └───────────────┘
```

There is no separate API server, no ORM, and no client-side data fetching on
the guest site. Server Components read, Server Actions write, RLS enforces
who may do what.

### Layering

| Layer | Path | Responsibility |
| --- | --- | --- |
| Types | `types/` | Domain shapes (`Wedding`, `RsvpRecord`, `RsvpFormConfig`…) shared by UI and services |
| Services | `services/` | All Supabase and SMTP access; maps `snake_case` rows → `camelCase` domain types |
| Features | `features/` | One folder per page section / dashboard page: server actions + client components |
| Components | `components/` | Site chrome (`site-nav`, `music-player`…) and the dashboard UI kit (`shell`, `drawer`, `toast`, `confirm`…) |
| Lib | `lib/` | Cross-cutting helpers: env access, Supabase clients, datetime, calendar, dashboard CRUD |
| Content | `content/` | Bundled seed fallback and RSVP form defaults |

The dependency direction is strictly downward: features call services, never
the other way; components never touch Supabase; **nothing outside `lib/env.ts`
reads `process.env`**.

---

## 2. Next.js App Router Structure

```text
app/
├── layout.tsx                 Root layout: fonts (Cormorant Garamond + Inter),
│                              generateMetadata() from wedding content (OG image = hero)
├── (site)/                    Public site route group
│   ├── layout.tsx             Mounts <MusicPlayer> (public pages only)
│   ├── page.tsx               The one-page site; `export const revalidate = 3600`
│   └── calendar.ics/route.ts  RFC 5545 calendar download (linked from emails)
├── login/page.tsx             Couple sign-in (password / magic link / reset)
├── auth/confirm/route.ts      Lands Supabase email links → cookie session
└── dashboard/
    ├── layout.tsx             Auth re-check + <DashboardShell> (providers, nav)
    ├── loading.tsx
    ├── page.tsx               Overview (stats, countdown, recent responses)
    ├── details/  story/  schedule/  gallery/  faqs/
    ├── rsvp-form/             RSVP form configuration
    ├── rsvps/                 Response management
    └── settings/              Email card + music settings
        └── password/          Change password
```

Notable choices:

- **Route group `(site)`** exists so the music player wraps only the guest
  experience — it must not mount on `/login` or `/dashboard`.
- **The public site is a single page** (`/`) with in-page anchors
  (`#story`, `#details`, `#schedule`, `#gallery`, `#faq`, `#rsvp`). A wedding
  invitation is a linear document; splitting it into routes would only add
  navigation friction.
- **`proxy.ts`** (Next 16's middleware successor) matches
  `/dashboard/:path*` and `/login`: it refreshes the Supabase session cookie
  on every matched request and enforces the two redirects
  (`/dashboard/** → /login` when signed out, `/login → /dashboard` when
  signed in).

### Rendering strategy

| Surface | Mode | Why |
| --- | --- | --- |
| `/` | ISR, `revalidate = 3600` | Content changes rarely; guests get CDN-fast loads. Dashboard saves call `revalidatePath("/")` so edits appear immediately anyway. |
| `/dashboard/**`, `/login`, `/auth/confirm`, `/calendar.ics` | Dynamic | Session cookies / fresh data on every request. |

Client components are used only where interaction demands it: nav, countdown,
gallery lightbox, music player, the RSVP form, scroll reveals, and the
dashboard managers. Everything else is Server Components.

---

## 3. Server Actions

All mutations are Server Actions — the app has **no hand-rolled API routes**
for data (the only route handlers are `/calendar.ics` and `/auth/confirm`,
which exist for non-JSON responses and email-link landing).

Two families:

### Guest actions (`features/rsvp/actions.ts`)

`submitRsvp` is the single anonymous mutation in the system. It is a
`useActionState` action: validate against the wedding's stored form
configuration → insert via the anon client → return a typed state
(`success` / `duplicate` / `error` with per-field messages and echoed values).
On success it schedules the couple's notification email with `after()` so the
guest never waits on SMTP (see [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md)).

### Dashboard actions (`features/dashboard/*/actions.ts`)

Every dashboard page exports thin actions that compose the shared helpers in
`lib/dashboard/crud.ts` (`insertRow`, `upsertRow`, `updateRow`, `deleteRow`,
`reorderRows`) and call `revalidateSite(...)`. The helpers:

- run as the signed-in user (cookie client → authenticated RLS),
- return a uniform `ActionResult` (`{ok:true,id?}` / `{ok:false,error}`),
- translate database errors into operator-friendly messages — including the
  "pending migration" family (`42P01`, `42703`, `PGRST204/205`) and the
  RLS-silently-filtered case (`count === 0` on update/delete).

Actions validate input *before* touching the database (required fields, URL
shape for images/music, time format, guest-count bounds), so the database
checks are a backstop rather than the first line of defense.

---

## 4. Authentication Flow

Supabase Auth with cookie sessions via `@supabase/ssr`. There is no sign-up
path anywhere — accounts are provisioned in the Supabase dashboard; the app
only signs in existing users.

```text
        ┌────────────── /login ───────────────┐
        │  Password  │  Magic link  │  Reset  │
        └─────┬────────────┬────────────┬─────┘
              │            │            │
   signInWithPassword   signInWithOtp   resetPasswordForEmail
              │        (shouldCreateUser:false)     │
              │            │            │
              │            └──── email ─┴──────────────┐
              │                                        ▼
              │                          /auth/confirm?token_hash|code
              │                          verifyOtp() / exchangeCodeForSession()
              │                                        │
              ▼                                        ▼
        cookie session ──────────▶ /dashboard   (reset → /dashboard/settings/password)
```

Defense in depth, four layers:

1. **`proxy.ts`** — refreshes the session cookie and redirects unauthenticated
   `/dashboard` requests. It calls `supabase.auth.getUser()` (validates the
   JWT against Supabase) rather than trusting `getSession()`, because cookies
   can be forged.
2. **`app/dashboard/layout.tsx`** — re-verifies `getUser()` and redirects,
   so the layout can never render for an anonymous request even if routing
   changes.
3. **RLS** — even a request that slipped past both would still hit
   policies; anonymous sessions simply cannot read RSVPs or write content.
4. **`SessionWatcher`** (client) — covers the long-idle tab: checks the
   session every 60 s and on window focus, and listens for `SIGNED_OUT`;
   when the session is gone it redirects to `/login?expired=1` so the couple
   sees "session expired" instead of watching saves fail.

Anti-enumeration: the magic-link and reset actions answer identically whether
or not the email is registered ("Signups not allowed" from Supabase is
deliberately swallowed), and the password form returns one generic
"don't match our records" message.

---

## 5. Supabase Integration

Three clients, each with a distinct job (`lib/supabase/`):

| Client | File | Key | Session | Used by |
| --- | --- | --- | --- | --- |
| `getSupabaseClient()` | `server.ts` | anon | none (module-level singleton) | Public reads (`wedding-service`), guest RSVP insert |
| `getSupabaseAuthClient()` | `server-auth.ts` | anon + cookies | per-request | Everything dashboard: auth, CRUD, RSVP admin, email tracking |
| `getSupabaseBrowserClient()` | `client.ts` | anon | browser | Only `SessionWatcher` today |

(`getSupabaseAdminClient()` — service role, RLS bypass — exists in `server.ts`
but has no production caller; it is reserved for future admin tooling.)

The cookie client is created **per request** and never cached; its `setAll`
swallows the read-only-cookies error when called from a Server Component,
because the proxy has already refreshed the session by then.

**Graceful degradation:** `getSupabaseClient()` returns `null` when env vars
are missing, and `getWeddingContent()` then serves the bundled seed with a
console warning — so a fresh clone renders without secrets. RSVP submission,
by contrast, *requires* Supabase and returns a friendly error until it is
configured. A configured-but-unreachable database throws loudly; the seed
must never mask a production outage.

---

## 6. Email Architecture (summary)

Full detail in [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md). The shape:

```text
services/email/
├── mailer.ts                 The one SMTP door (Nodemailer + Gmail), typed SendResult
├── template-kit.ts           Email-safe design system (tables, inline CSS, palette)
├── templates/
│   ├── confirmation.ts       Guest-facing confirmation (hero, details card, calendar buttons)
│   └── new-rsvp.ts           Couple-facing "new RSVP received" notification
├── confirmation-service.ts   Send + record tracking columns on the rsvps row
└── notification-service.ts   Couple notifications; recipient resolution; never throws
```

Design rules: templates are pure functions returning
`{subject, html, text}`; only services send; only `confirmation-service`
writes tracking; the caller decides *whether* to send (once-only rules live in
the actions), the service owns *how*.

---

## 7. Data Flow

**Read path (guest):**
`page.tsx` → `getWeddingContent()` (React `cache()`, one DB pass per render)
→ parallel selects → `snake_case → camelCase` mapping → props into feature
sections. The RSVP form receives its *effective configuration* — stored
`rsvp_form_fields` rows merged over `content/rsvp-form-defaults.ts`, with
identity fields forced visible+required.

**Write path (guest RSVP):**

```text
RsvpForm (client, useActionState)
  → submitRsvp (server action)
      → parseRsvpForm(formData, config)      config-aware validation
      → saveRsvp(weddingId, input)           anon insert; 23505 → duplicate
      → after(() => sendNewRsvpNotification) post-response, failure-isolated
  ← typed state: success | duplicate | error{fieldErrors, values}
```

**Write path (dashboard):** manager component → feature action → `crud.ts`
helper (authenticated client) → `revalidateSite()` → optimistic UI update or
toast + rollback in the manager.

**Status-change path with email** (the most intricate flow) is documented
step-by-step in [DASHBOARD.md](DASHBOARD.md) §§6–7.

---

## 8. Request Lifecycle

A representative dynamic request, `GET /dashboard/rsvps`:

1. **proxy.ts** (matcher hit) — refresh session cookies; `getUser()`; signed
   in → continue.
2. **`dashboard/layout.tsx`** — `getUser()` again; fetch wedding content for
   the shell (couple names, monogram); mount providers
   (SaveStatus, Toast, Confirm) around the page.
3. **`rsvps/page.tsx`** — `getWeddingContent()` (cached — same render pass as
   the layout's call, so one DB trip) + `listRsvps(wedding.id)` as the
   authenticated user.
4. Server-rendered HTML streams; the `RsvpTable` client component hydrates
   with the rows as initial state.
5. Subsequent interactions (status change, resend) are Server Action POSTs
   that re-run steps 1–2's guarantees implicitly (actions use the cookie
   client) and return typed results the table applies optimistically.

And the ISR guest page, `GET /`: served from cache; at most hourly (or
immediately after any dashboard save, via `revalidatePath("/")`) Next.js
re-renders it server-side, which re-runs `getWeddingContent()`.

---

## 9. Design Decisions

The decisions below are the ones a maintainer most needs to understand — each
with the reasoning that produced it.

1. **Platform, not one-off** — every wedding fact lives in the database keyed
   by `wedding_id`; the deployment picks its wedding via `WEDDING_SLUG`. A
   second wedding is a new row + seed, not a fork. The single-tenant
   simplification (any authenticated user manages everything) is documented
   at its source (migration 00002) with the exact upgrade path.
2. **RLS as the security boundary, anon key in the client** — instead of
   hiding the database behind an API. Policies are small, auditable, and hold
   even if application code regresses. Insert-only RSVPs for `anon` means a
   leaked anon key can spam but never read.
3. **Duplicates prevented by the database, not the app** — unique index on
   `(wedding_id, lower(email))`. Application checks race; indexes don't.
4. **Server Actions everywhere; no JSON API** — every mutation is a typed
   function call with a typed result. Forms work with `useActionState`,
   validation errors travel as data, and there is no fetch layer to keep in
   sync.
5. **Services own row mapping** — the `snake_case`/`camelCase` boundary sits
   in one layer, so schema renames touch one file per entity.
6. **Config-over-code for the RSVP form** — the couple edits fields, labels,
   meal options, and limits in the dashboard; defaults live in
   `content/rsvp-form-defaults.ts` so an empty config table renders the
   original design. Locked identity fields keep the data model sound no
   matter what the configuration says.
7. **Emails: templates are pure, sending is centralized, tracking is
   auditable** — and the *decision* to send stays in the actions, keeping
   once-only semantics reviewable in one place.
8. **Failure isolation for side effects** — the couple's new-RSVP
   notification runs in `after()` (post-response) and the status-change
   email failure never rolls back the status: the primary mutation must
   succeed or fail on its own merits.
9. **Migration-tolerant services** — post-initial tables/columns are treated
   as optional with explicit fallbacks, so deploying code ahead of running a
   migration degrades politely (with actionable operator hints) instead of
   crashing the site.
10. **Seed fallback only for the unconfigured case** — demos and CI work with
    zero secrets, but a *configured* environment fails loudly rather than
    serving stale content.

---

## 10. Future Extension Points

Places the current design already anticipates growth, with the seams to use:

| Extension | Seam that exists today |
| --- | --- |
| Second wedding / multi-tenant | `wedding_id` on every table + `WEDDING_SLUG`; add `wedding_members` and scope the authenticated RLS policies (per the note in migration 00002) |
| Configurable notification recipient (dashboard setting) | `getRsvpNotificationRecipient()` in `notification-service.ts` is async and the *only* place the recipient is decided — swap in a `weddings` column read without touching call sites |
| More email types (reminders, thank-yous) | `template-kit.ts` was built to compose them; add a template + a service function |
| Admin tooling that must bypass RLS | `getSupabaseAdminClient()` exists, unused, with its warnings written |
| Client-side dashboard features (realtime counts) | `getSupabaseBrowserClient()` exists; RLS already permits authenticated reads |
| Image uploads | `next.config.ts` already allows Supabase Storage public URLs (`*.supabase.co/storage/v1/object/public/**`); today images are pasted URLs |
| Guest-list import / export beyond CSV | CSV export is client-side in `rsvp-table.tsx`; a server exporter would reuse `listRsvps()` |

Known intentional limitations (not bugs): no rate limiting on RSVP
submission beyond the duplicate index; no RSVP delete anywhere; timezone
math assumes no DST for the venue timezone (`Asia/Manila` — correct for the
Philippines) in `lib/datetime.ts`'s `toInstantIso`.
