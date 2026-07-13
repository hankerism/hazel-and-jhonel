# CHANGELOG.md — Project History

Version numbers below are **documentation milestones** grouped by feature,
reconstructed from the repository history (`package.json` itself stays at
`0.1.0` — the app is deployed continuously, not released). Dates are the
dates the work landed.

---

## v1.3.0 — New-RSVP Notification *(2026-07-14, current)*

The couple is notified the moment a guest responds.

### Added
- **New-RSVP notification email** to the couple on every new submission:
  guest, attendance, party size, meal, plus-one, song request, special
  message, and submission time (in the wedding's timezone), with a
  **Review RSVP** button into the dashboard
  (`services/email/templates/new-rsvp.ts`).
- **Notification service** (`services/email/notification-service.ts`) with
  centralized recipient resolution: `RSVP_NOTIFICATION_EMAIL` env override →
  default couple inbox. Written to never throw.
- `RSVP_NOTIFICATION_EMAIL` environment variable (documented in
  `.env.example`).
- This documentation set (`docs/`).

### Changed
- `submitRsvp` schedules the notification with Next.js `after()` — it runs
  after the guest's response is sent, so submission is never delayed and can
  never fail because of email.
- `RenderedEmail` type moved into the shared template kit.

### Guarantees
- Exactly one notification per new RSVP: edits, status changes,
  confirmations, and resends never re-notify; duplicates return before the
  send is scheduled.
- Verified end-to-end: live submission → save → notification delivered →
  duplicate submission produces no second email.

---

## v1.2.0 — Production Email System & Configurable RSVP Form *(2026-07-13)*

The wedding communicates back, and the couple owns their form.

### Added
- **Email foundation**: Nodemailer mailer with Gmail SMTP, typed
  `SendResult`, fail-fast timeouts, and secret-free error translation
  (`services/email/mailer.ts`); email-safe **template kit** mirroring the
  site's design system (tables, inline CSS, Outlook-safe buttons).
- **Guest confirmation email** — monogram, hero photo, personal note,
  details card, **Google Calendar** link and **`.ics` download**, the
  couple's signature (`templates/confirmation.ts`).
- **Automatic send on confirmation**: marking an accepted RSVP *Confirmed*
  emails the guest exactly once; deliberate **Resend** button for
  after-the-fact sends; **Send Test Email** card in Settings (real template,
  unique subject stamp to defeat Gmail threading).
- **Email tracking** on each RSVP: status / sent-at / message id / last
  error, shown in the response drawer (migration `00004`).
- **Public `/calendar.ics` route** (RFC 5545, TZID-anchored times).
- **Configurable RSVP form** (migration `00003`): per-field visibility,
  requiredness, labels, placeholders, help text; couple-managed **meal
  options**; max party size, deadline, allow-decline, conditional plus-one.
  Identity fields locked on. Defaults reproduce the original form exactly.
- Config-aware server-side validation of guest submissions.

### Fixed *(2026-07-13, follow-up)*
- Email footer/website links now use a canonical site URL with a safety
  guard: `NEXT_PUBLIC_SITE_URL` → Vercel production URL → request origin,
  **refusing Supabase hosts** (a mis-pasted env var had produced database
  URLs in guest-facing links).

---

## v1.1.0 — Couple Dashboard, Authentication & Music *(2026-07-12 → 07-13)*

The couple takes the wheel.

### Added
- **Supabase Auth** sign-in: password, magic link, and password reset — all
  without account enumeration; `/auth/confirm` landing for both link styles;
  change-password page.
- **Route protection**: `proxy.ts` (session refresh + guards), dashboard
  layout re-verification, and a client `SessionWatcher` for long-idle tabs.
- **Dashboard** with eight pages: Overview (stats, countdown, recent
  responses), Wedding Details, Story, Schedule, Gallery, FAQs, RSVP
  Responses, Settings (the ninth — RSVP Form — arrived in v1.2.0) — built on a shared UI kit (shell, drawer, confirm
  dialog, toasts, save-status, drag-to-reorder) and shared CRUD helpers with
  migration-aware error messages.
- **RSVP management**: search / filters / CSV export, detail drawer, status
  workflow `pending → confirmed / contacted` (migration `00002` replaced
  `archived` with `contacted`).
- **Story milestones** table + editor (migration `00002`).
- **Background music**: floating site player with couple-configurable track
  and autoplay (columns on `weddings`).
- Authenticated RLS policies: the couple manages content and reads/updates
  RSVPs; still no delete on responses.
- Custom favicon and branding polish across dashboard and auth screens.

---

## v1.0.0 — Public Wedding Website with Live RSVP *(2026-07-12)*

The guest-facing product, end to end.

### Added
- **One-page wedding website**: hero with countdown, Our Story, wedding
  details with maps links, Order of the Day, gallery with lightbox, FAQs,
  and the RSVP section — server-rendered, hourly ISR.
- **Supabase schema** (migration `00001`): `weddings`, `schedule_items`,
  `gallery_images`, `faqs`, `rsvps` — multi-wedding keyed, RLS from day one
  (anon: read content, **insert-only** RSVPs), `updated_at` triggers, and
  the duplicate-blocking unique index on `(wedding_id, lower(email))`.
- **Guest RSVP flow**: accept/decline, party size, plus-one, meal
  preference, dietary notes, song request, message; typed server action
  with per-field errors that preserve guest input; friendly duplicate
  handling.
- **Services layer** mapping database rows to domain types; seed fallback
  for unconfigured environments (configured failures throw loudly).
- Seed content for Hazel & Jhonel (`supabase/seed.sql` + `content/seed.ts`).
- SEO/OpenGraph metadata generated from wedding content.

### Notes
- This milestone replaced the abandoned first-generation "Ever After"
  invitation concept (wax-seal experience, per-guest invite codes); its
  database remnants are removable via `supabase/cleanup-ever-after.sql`.

---

## v0.1.0 — Scaffold *(2026-07-12)*

- Initial commit from Create Next App: Next.js 16 (App Router, Turbopack),
  TypeScript, Tailwind CSS v4, ESLint 9.
