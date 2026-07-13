# EMAIL_SYSTEM.md — Production Email System

*Synchronized with the implementation as of 2026-07-14.*

The platform sends three kinds of email, all through one mailer and one
template kit:

| Email | Recipient | Trigger | Source |
| --- | --- | --- | --- |
| **Confirmation** | Guest | Couple confirms an accepted RSVP (once), or clicks resend | `templates/confirmation.ts` via `confirmation-service.ts` |
| **New-RSVP notification** | Couple | Guest submits a new RSVP (exactly once, on creation) | `templates/new-rsvp.ts` via `notification-service.ts` |
| **Test email** | Signed-in dashboard user | "Send Test Email" in Settings | `sendTestEmail` in `features/dashboard/settings/actions.ts` |

```text
services/email/
├── mailer.ts                  Nodemailer transport + typed sendEmail()
├── template-kit.ts            Email-safe building blocks + RenderedEmail type
├── templates/
│   ├── confirmation.ts        renderConfirmationEmail()
│   └── new-rsvp.ts            renderNewRsvpNotification()
├── confirmation-service.ts    sendRsvpConfirmation() + tracking writes
└── notification-service.ts    sendNewRsvpNotification() + recipient resolution
```

---

## 1. SMTP Configuration

All SMTP settings come from the environment via `lib/env.ts` (nothing else
reads `process.env`). `isSmtpConfigured()` requires **host, port, user, pass,
and from-email**; every send path checks it first and degrades with a clear
message instead of throwing.

| Variable | Example (Gmail) | Notes |
| --- | --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `465` (or `587`) | |
| `SMTP_SECURE` | `true` for 465, `false` for 587 | Compared as the string `"true"` |
| `SMTP_USER` | the Gmail address | |
| `SMTP_PASS` | 16-char App Password | **Never** the account password |
| `SMTP_FROM_NAME` | `Hazel & Jhonel` | Display name on the From header |
| `SMTP_FROM_EMAIL` | the Gmail address | Required for `isSmtpConfigured()` |
| `SMTP_REPLY_TO` | optional | Falls back to `SMTP_FROM_EMAIL` |

These are server-side only: they are read exclusively by server actions and
services, so credentials never reach the client bundle.

## 2. Gmail App Password Setup

Gmail rejects normal passwords for SMTP. One-time setup:

1. Google Account → **Security** → enable **2-Step Verification** (required).
2. Security → **App passwords** → create one (app: "Mail", device: anything).
3. Put the 16-character password in `SMTP_PASS` (spaces don't matter).
4. `SMTP_USER` and `SMTP_FROM_EMAIL` = the Gmail address itself. Gmail
   rewrites mismatched From addresses, so don't try to send "as" another
   domain from a Gmail account.

If credentials are wrong, the mailer surfaces exactly this hint — see §10.

## 3. Mailer Architecture (`mailer.ts`)

One module owns the SMTP connection; everything else composes it.

- **Singleton transport** — `nodemailer.createTransport` once per server
  process, with fail-fast timeouts so a dead network can't hang a server
  action: `connectionTimeout: 10s`, `greetingTimeout: 10s`,
  `socketTimeout: 20s`.
- **Typed results, no throws** —
  `SendResult = {ok:true, messageId} | {ok:false, error}`. Callers branch on
  `ok`; nothing upstream needs try/catch for control flow.
- **Secret-free error translation** — raw SMTP errors are logged server-side
  (`console.error("[mailer] …")`) while the returned `error` string is safe
  to show the couple (no hosts, no credentials). See §10.
- **`verifySmtpConnection()`** — checks config + connection without sending;
  available for diagnostics.
- **`sendEmail(message)`** — sets From (`SMTP_FROM_NAME` +
  `SMTP_FROM_EMAIL`), Reply-To (`SMTP_REPLY_TO` fallback From), and sends
  both `html` and `text` parts.

## 4. Template Kit (`template-kit.ts`)

The email-safe translation of the website's design system. Constraints
honored throughout: **table-based layout, fully inlined CSS, web-safe fonts**
(Georgia ≈ the site's serif, Helvetica for body), no external stylesheets, no
scripts — renders correctly in Gmail, Apple Mail, Outlook, and Yahoo.

Building blocks (all pure functions returning HTML strings):

| Block | Renders |
| --- | --- |
| `layout({title, preheader, body})` | Full HTML document: parchment canvas, centered 600px ivory card, hidden preheader for inbox preview text |
| `monogram(initials)` | Serif monogram with hairline rule (e.g. `H · J`) |
| `eyebrow(text, color?)` | Letterspaced small-caps label |
| `divider()` / `dividerLine(width?)` | Thin gold rules |
| `hero(imageUrl, alt)` | Softly rounded photograph |
| `infoCard(rows)` | Bordered white card of label/value rows |
| `buttons(specs)` | Bulletproof buttons (border-based, Outlook-safe), `solid` or `outline` |
| `footer({brideName, groomName, websiteUrl})` | "With love" signature + reply note + website link (guest emails) |
| `escapeHtml(value)` | Applied to **every** interpolated user value |
| `palette`, `serif`, `sans` | Shared color/font tokens (ivory, parchment, charcoal, gold…) |

`RenderedEmail = {subject, html, text}` is the contract every template
returns — templates are pure functions; only services send.

## 5. Confirmation Email (`templates/confirmation.ts`)

The guest-facing email — "a printed invitation in inbox form."

- **Subject:** `Your RSVP is confirmed — {Bride} & {Groom}, {long date}`
- **Body:** monogram → "Your RSVP is confirmed" eyebrow → couple names →
  optional hero photo → personal note addressed to the guest's first name →
  detail card (guest, status, date, ceremony/reception times, venue, dress
  code, seats, meal, plus-one — optional rows only when present) → three
  buttons: **View Wedding Website** (solid), **Add to Google Calendar**,
  **Download Calendar (.ics)** → the couple's signature footer.
- A site-relative hero image (an uploaded `/images/…` path) is anchored to
  the public site URL, because email clients require absolute URLs.
- Full plain-text alternative included.

**When it sends** — `sendRsvpConfirmation(rsvpId, siteUrl)` in
`confirmation-service.ts`:

1. Loads the RSVP row (as the signed-in couple; RLS-checked).
2. Refuses non-attending RSVPs ("Confirmation emails are for accepted
   RSVPs.").
3. Renders and sends to the guest's email.
4. Records the outcome in the tracking columns (§9) — a tracking-write
   failure is logged but never masks the send result.

The *decision* to send lives in the dashboard actions, not the service — see
§8 and [DASHBOARD.md](DASHBOARD.md) §7 for the once-only rules.

## 6. New-RSVP Notification (`templates/new-rsvp.ts`)

The couple-facing internal notification — same stationery, written for
review.

- **Subject:** `🎉 New RSVP Received — {Guest Name}`
- **Body:** monogram → "New RSVP received" eyebrow → guest name → "A new
  RSVP has been submitted and is waiting for your review." → info card:
  Guest, Attendance (*Accepts with pleasure* / *Regretfully declines*),
  Guest Count, Meal / Plus One / Song Request (only when provided),
  Submitted (date & time **in the wedding's timezone**) → the guest's
  special message as an italic pull-quote (when provided) → one solid
  **Review RSVP** button → `{Bride} & {Groom} Wedding Dashboard` footer.
- The Review button opens `{siteUrl}/dashboard/rsvps`.

**Recipient resolution** — centralized in `notification-service.ts`:

```ts
getRsvpNotificationRecipient(): Promise<string>
// RSVP_NOTIFICATION_EMAIL (env override) → default "hazelandjhonel@gmail.com"
```

This is deliberately the *only* place the recipient is decided, and it is
async so a future dashboard setting (a `weddings` column) can replace the
env/default logic without touching any call site.

**When it sends** — from `submitRsvp` (`features/rsvp/actions.ts`), only on
successful **creation** of a new RSVP:

```ts
const submittedAt = new Date().toISOString();
const siteUrl = await getSiteUrl();
after(() => sendNewRsvpNotification({ wedding, rsvp, submittedAt, siteUrl }));
```

Guarantees, by construction:

- **Exactly once per new RSVP.** `submitRsvp` is the only creation path in
  the codebase; dashboard edits, status changes, confirmations, and resends
  live in different actions that never call the notification service.
  Duplicate submissions return before the send is scheduled.
- **Never blocks the guest.** `after()` (from `next/server`) runs the
  callback *after the response is sent*; the guest's success screen does not
  wait on SMTP.
- **Never fails the RSVP.** The RSVP is already saved and the response
  already returned when the send runs — and `sendNewRsvpNotification` is
  written to never throw: unconfigured SMTP, render errors, and send
  failures are all caught, logged (`[notification-service] …`), and
  swallowed. There is no rollback path.

## 7. Test Email

`sendTestEmail` (Settings → Email card) sends **the real production
confirmation template** with sample guest data ("Test Guest", 2 guests,
Chicken, plus-one) to the **signed-in dashboard user's own email** — proving
template rendering, SMTP credentials, and deliverability in one click. The
card shows the from-address, a configured/not-configured indicator, and the
resulting message id or full error.

Implementation detail worth keeping: the subject is prefixed
`[Test HH:MM:SS]` because identical subjects make Gmail thread test emails
into one conversation, mixing old and new sends during troubleshooting.

## 8. Resend Workflow

Two dashboard actions in `features/dashboard/rsvps/actions.ts` share the
`EmailOutcome` result type:

- **`updateRsvpStatus(id, status)`** — changing status to `confirmed` on an
  *attending* RSVP auto-sends the confirmation **exactly once**: the action
  reads the tracking state *before* updating the row (so the once-only rule
  can't race), skips if a previous send succeeded (`already-sent`) or SMTP
  is unconfigured (`not-configured`), and never rolls back the status change
  on email failure.
- **`resendConfirmationEmail(id)`** — the only path that sends again after a
  successful send. Deliberate, button-triggered, available in the response
  drawer once a response is `confirmed` + attending. The button reads
  "Send Confirmation Email" when no send has succeeded yet, "Resend…"
  otherwise.

## 9. Tracking Fields

Migration `00004` added four columns to `rsvps`, written only by
`confirmation-service.ts` and displayed in the response drawer:

| Column | Meaning |
| --- | --- |
| `confirmation_email_status` | `null` = never attempted · `'sent'` = accepted by SMTP · `'failed'` = last attempt errored |
| `confirmation_email_sent_at` | Timestamp of the last successful send |
| `confirmation_email_message_id` | SMTP message id (audit/debug handle) |
| `confirmation_email_error` | Human-readable last failure; cleared on success |

Semantics: the fields describe the **last attempt**. A failure after an
earlier success would overwrite status to `failed` — acceptable for this
scale, and the message id of the earlier success remains until the next
success. The new-RSVP notification is deliberately *not* tracked in the
database; its outcome is logged server-side only.

## 10. Error Handling

Layered, with one principle: **email failure is information, never
breakage.**

**Mailer translation** (`friendlySmtpError`) — raw error logged, safe message
returned:

| Raw condition | Returned message (abridged) |
| --- | --- |
| `EAUTH` / SMTP 535 | Credentials rejected — for Gmail use an App Password in `SMTP_PASS` |
| `ECONNECTION` / `ESOCKET` / `ECONNREFUSED` | Can't reach the server — check `SMTP_HOST`/`SMTP_PORT` and network |
| `ETIMEDOUT` / message matches "timed out" | Server too slow — try again |
| SMTP 550/553 | Recipient address rejected |
| anything else | "Sending failed unexpectedly. The full error was logged on the server." |

**Flow-level behavior:**

- Unconfigured SMTP: every path short-circuits with "set the SMTP_*
  variables" — status changes still save, guests still submit.
- Confirmation failure: status change survives; tracking records `failed` +
  the error; the drawer shows a "Last error" details block and the toast
  says the email can be resent later.
- Notification failure: logged, swallowed, guest unaffected (§6).
- Tracking-write failure: logged, does not mask the send result.

## 11. Calendar (.ics)

`lib/calendar.ts` builds an RFC 5545 document served by
`app/(site)/calendar.ics/route.ts` as an attachment (`wedding.ics`), linked
from the confirmation email.

- Event window: ceremony start → midnight (the published schedule ends with
  a 12:00 AM closing).
- Times are written as **floating local time with `TZID`**
  (`DTSTART;TZID=Asia/Manila:20261130T160000`) so every calendar app shows
  4:00 PM Manila regardless of the viewer's timezone.
- Location = ceremony venue + address lines; description = the couple's
  welcome message; text fields escaped per RFC 5545.

## 12. Google Calendar Integration

`googleCalendarUrl(wedding)` (same module) builds a prefilled
`calendar.google.com/calendar/render?action=TEMPLATE` link with the same
event window, `ctz={wedding.timezone}`, title, description, and location —
used as the second button in the confirmation email. No API keys or OAuth
involved; it is a plain deep link.

## 13. Environment Variables (email-related)

Authoritative list in `.env.example`; email-relevant subset:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | for sending | Transport |
| `SMTP_USER` / `SMTP_PASS` | for sending | Gmail address + App Password |
| `SMTP_FROM_EMAIL` | for sending | Sender; part of `isSmtpConfigured()` |
| `SMTP_FROM_NAME` | no | Display name (falls back to from-email) |
| `SMTP_REPLY_TO` | no | Falls back to from-email |
| `RSVP_NOTIFICATION_EMAIL` | no | Overrides the couple-notification recipient (default `hazelandjhonel@gmail.com`, resolved in `notification-service.ts`) |
| `NEXT_PUBLIC_SITE_URL` | recommended in prod | Base for email links/calendar; resolution: this → `VERCEL_PROJECT_PRODUCTION_URL` → request origin. `lib/site-url.ts` **refuses Supabase hosts** as the site URL (guards a mis-pasted env var from turning email links into database links). |
