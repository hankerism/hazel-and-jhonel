# DASHBOARD.md — Couple Dashboard

*Synchronized with the implementation as of 2026-07-14.*

The dashboard (`/dashboard/**`) is the couple's private control panel:
website content, RSVP form configuration, guest responses, and settings.
Everything the couple saves publishes to the live website immediately.

---

## 1. Authentication

Access requires a Supabase Auth account (created by an operator in the
Supabase dashboard — the app has **no sign-up path**).

**Sign-in options at `/login`** (`features/auth/`):

| Mode | Action | Behavior |
| --- | --- | --- |
| Password | `signIn` | `signInWithPassword` → redirect `/dashboard`. Generic error on failure (no hint whether email exists). |
| Email link | `requestMagicLink` | `signInWithOtp` with `shouldCreateUser: false`; the "sent" panel appears whether or not the email is registered (anti-enumeration). Link valid one hour. |
| Forgot password | `requestPasswordReset` | `resetPasswordForEmail` → link lands on `/dashboard/settings/password`. Same anti-enumeration property. |

Email links land on **`/auth/confirm`**, which supports both Supabase link
styles (`?token_hash=…&type=…` via `verifyOtp`, and `?code=…` via
`exchangeCodeForSession`), sanitizes the `next` param to same-origin paths,
and redirects to `/login?link=invalid` on a used/expired link.

**Protection layers** (details in [ARCHITECTURE.md](ARCHITECTURE.md) §4):
`proxy.ts` guards `/dashboard/:path*` and `/login` (session refresh +
redirects, validating with `getUser()`); the dashboard layout re-verifies
`getUser()`; RLS backs everything; and the client-side `SessionWatcher`
checks every 60 s / on focus and redirects long-idle tabs to
`/login?expired=1` instead of letting saves fail.

Signing out (topbar button) asks for confirmation, then `signOut` clears the
session and redirects to `/login`.

## 2. Navigation & Shell

`components/dashboard/shell.tsx` renders the frame: a sticky sidebar
(desktop) or hamburger panel (mobile), a topbar with the couple's names, a
global save-status indicator, the signed-in email, and Sign out. The
monogram links back to the public website. A footnote states the contract:
*"Changes publish to the live website when saved."*

| Route | Page | Manages |
| --- | --- | --- |
| `/dashboard` | Overview | Read-only stats |
| `/dashboard/details` | Wedding Details | The `weddings` row |
| `/dashboard/story` | Story | `story_milestones` |
| `/dashboard/schedule` | Schedule | `schedule_items` |
| `/dashboard/gallery` | Gallery | `gallery_images` |
| `/dashboard/faqs` | FAQs | `faqs` |
| `/dashboard/rsvp-form` | RSVP Form | `rsvp_form_fields`, `meal_options`, form settings |
| `/dashboard/rsvps` | RSVP Responses | `rsvps` (status + emails) |
| `/dashboard/settings` | Settings | Email card, music settings |
| `/dashboard/settings/password` | — | Change password (linked from reset emails) |

Shared UI kit (`components/dashboard/`): `Card`/`Input`/`Select`/`Button`/
`EmptyState` primitives (`ui.tsx`), slide-over `Drawer`, promise-based
`ConfirmProvider` dialog, `ToastProvider` notifications, `SaveStatusProvider`
(the topbar "Saving… / Saved" indicator), and `SortableList` for
drag-to-reorder.

## 3. Management Pages

### Overview (`/dashboard`)

Computed live from `listRsvps()`: Total Responses, Accepted, Declined,
Acceptance %, **Guests Coming** (sum of `guestCount` over attending — "seats
to set"), Pending Review; plus the wedding countdown and the five most
recent responses linking to the full list.

### Wedding Details (`/dashboard/details`)

One form over the `weddings` row: names, date, ceremony/reception times &
venues & addresses (multiline → stored newline-separated), RSVP deadline,
dress code, wedding colors (comma-separated → `text[]`), parking note,
welcome message, hero image URL. Eight fields are required server-side;
saving revalidates the site, `/dashboard/details`, and `/dashboard`.

### Story / Schedule / Gallery / FAQs

Four list managers with the same CRUD + reorder pattern (§4):

| Page | Item fields | Validation |
| --- | --- | --- |
| Story | title, body, optional image URL | title required |
| Schedule | time, title, optional description | `HH:MM` time + title required |
| Gallery | image URL, optional caption | URL must be `https://…` or `/path` |
| FAQs | question, answer | both required |

### RSVP Form (`/dashboard/rsvp-form`)

Three sections, all live on the public form after save:

- **Fields** — for each of the ten known fields: visibility, requiredness,
  label, placeholder, help text (`saveFieldConfig`, upsert keyed on
  `wedding_id,field_key`). The identity fields — First Name, Last Name,
  Email — are **locked** visible + required (they anchor records and
  duplicate detection); the action enforces this server-side regardless of
  what the UI sends.
- **Meal options** — add / rename / delete / reorder the menu guests choose
  from.
- **Settings** — maximum guests (1–20), RSVP deadline, allow "Regretfully
  Declines", conditional plus-one (`saveRsvpFormSettings`, written to
  `weddings` columns).

### RSVP Responses (`/dashboard/rsvps`)

See §§5–6.

### Settings (`/dashboard/settings`)

- **Email card** — configured indicator + sending identity
  (`SMTP_FROM_EMAIL`), and **Send Test Email** (the real confirmation
  template, to the signed-in user; shows message id or the full error).
  SMTP itself is environment configuration, deliberately not editable in the
  dashboard.
- **Music** — background music URL (`https://…` or `/path`) and autoplay
  toggle (`updateMusicSettings`).
- **Password** — `/dashboard/settings/password`: new password ≥ 8 chars,
  confirmed, via `supabase.auth.updateUser`.

## 4. CRUD Flow

Every content mutation follows one path:

```text
Manager component (client)
  │  optimistic update or pending state
  ▼
Feature action ("use server")          features/dashboard/<page>/actions.ts
  │  input validation (required, format, bounds)
  ▼
Shared helper                          lib/dashboard/crud.ts
  │  insertRow / upsertRow / updateRow / deleteRow / reorderRows
  │  cookie client → authenticated RLS
  │  errors → friendly messages (incl. migration hints)
  ▼
revalidateSite(dashboardPaths…)        revalidatePath("/") + changed pages
  ▼
ActionResult back to the component     → toast success, or rollback + error toast
```

Error translation in `crud.ts` deserves emphasis: missing tables/columns
(Postgres `42P01`/`42703`, PostgREST `PGRST204`/`PGRST205`) and RLS-filtered
updates (`count === 0`) all return *"This feature needs a database
migration — run the latest files in supabase/migrations…"* — turning the
most confusing failure mode (deployed code ahead of the database) into an
actionable instruction.

Reordering is a `SortableList` drag; the action writes `sort_order`/
`display_order` = index + 1 sequentially.

## 5. Save & Revalidation Behavior

- The public page is ISR-cached (`revalidate = 3600`), but **every**
  successful dashboard save calls `revalidatePath("/")` — so edits are live
  for the next guest request immediately; the hourly window is only a
  backstop for out-of-band database edits.
- Actions also revalidate the dashboard page(s) whose server-rendered data
  changed (e.g. form settings revalidate `/dashboard/rsvp-form` *and*
  `/dashboard/details`, which both display the deadline).
- Client managers keep UI state in sync without full reloads: list managers
  update from action results; the RSVP table applies **optimistic status
  changes and rolls back on failure**.
- The topbar `SaveStatusIndicator` reflects in-flight saves globally.

## 6. RSVP Workflow

Statuses: **pending** (new submission) → **confirmed** / **contacted**
(freely switchable; buttons in the response drawer). There is deliberately
no delete — see [DATABASE.md](DATABASE.md) §3.

```text
Guest submits RSVP ──▶ status: pending ──▶ 📧 couple notified (automatic)
                                             │
                     couple opens /dashboard/rsvps, reviews the response
                                             │
              ┌── sets "contacted" (spoke with guest; no email involved)
              │
              └── sets "confirmed" ──▶ attending? ──▶ 📧 guest confirmation
                                                       (once — see §7)
```

**The table** — search by name/email (`/` focuses the box), filter by
attendance (Accepted/Declined) and status, live "N of M" count, and
**Export CSV** (client-side; exports the currently filtered rows with all
thirteen columns).

**The drawer** (click a row) — full response detail (email, phone, plus-one,
meal, dietary notes, song request, message, submitted timestamp), status
buttons, and the **Confirmation Email** panel: status chip
(Sent / Failed / Not Sent), sent-at, message id, an expandable "Last error",
and the send/resend button (visible only for `confirmed` + attending).

## 7. Email Workflow (from the dashboard's perspective)

Full system detail in [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md).

**Confirming sends, exactly once.** `updateRsvpStatus` reads the email
tracking state *before* writing the status (so the once-only rule can't
race), then — only for `confirmed` + attending:

| Prior state | Outcome | Toast |
| --- | --- | --- |
| Never sent successfully | Sends now | "Marked as confirmed — confirmation email sent" |
| Previously sent | Skips | "…confirmation was already emailed" |
| SMTP unconfigured | Skips | "…set up email in Settings to notify guests" |
| Send fails | Status **still saved**; failure recorded | "Status saved, but the email failed — you can resend later" |

Setting `pending` or `contacted` never sends anything. Editing nothing else
triggers email — the only three senders in the system are: confirming (auto,
once), the resend button (deliberate), and the settings test email.

**Resending** is always available for confirmed attending guests and is the
only path that sends again after a success. Each attempt updates the
tracking fields, so the drawer always shows the latest outcome.

**New-RSVP notifications** don't appear in this UI at all — they fire on
guest submission (before the response is ever seen here) and their outcome
lives in the server logs, by design.
