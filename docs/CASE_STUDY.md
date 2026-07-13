# Case Study — A Production Wedding Platform for Hazel & Jhonel

*A one-page wedding website with a real RSVP back office: Next.js 16,
Supabase, and a Gmail-powered email system, built to production quality in
three days.*

---

## The Problem

A wedding sounds like a static-site problem until you look at what actually
has to happen. Hazel and Jhonel needed an accurate headcount — seats to
set, meals to order — collected from dozens of guest households with zero
tolerance for duplicates or lost responses. They needed to keep the website
itself current (schedules shift, photos arrive, FAQs accumulate) without
calling a developer for every edit. And their guests deserved something
that felt like an invitation, not a form.

So the real product is three products wearing one domain name: an elegant
guest experience, a data-collection pipeline with integrity guarantees, and
a content-management back office for two non-technical users — plus an
email layer tying them together.

## The Goals

1. **Guests feel invited.** One beautiful page — story, details, schedule,
   gallery — with an RSVP that takes under a minute on a phone.
2. **The couple owns everything.** Every wedding fact, every photo, every
   form field editable in a private dashboard, live on save.
3. **The headcount is trustworthy.** One response per household email,
   enforced where it cannot race; responses can never be read by guests or
   deleted by anyone.
4. **Email that behaves like production email.** Confirmations sent exactly
   once, failures visible and retryable, and no email problem ever blocking
   a save or a guest.
5. **A platform, not a one-off.** A second wedding should be a database row
   and a seed file, not a fork.

## The Architecture

One Next.js 16 application, two faces, one Postgres database:

```text
Guests (anonymous) ──▶  /             ISR page, anon reads via RLS
                        └─ RSVP form ─ Server Action ─ insert-only
Couple (session)   ──▶  /dashboard/** Server Actions ─ full CRUD
                                          │
                        Nodemailer ── Gmail SMTP (confirmations,
                        notifications, test sends)
```

The load-bearing decision: **Row Level Security is the security boundary.**
The browser only ever holds Supabase's public anon key; policies — not
application code — decide that anonymous visitors may read content and
*insert* RSVPs but never read, update, or delete them. Even a leaked key
can't enumerate responses. The couple authenticates through Supabase Auth
(password, magic link, or reset flow — with no account enumeration), and
their writes run under `authenticated` policies. There is no JSON API to
secure because there is no JSON API: every mutation is a typed Server
Action returning a typed result.

Layering keeps it maintainable: routes are thin; `features/` hold
per-section actions and components; `services/` own every database and SMTP
call and the `snake_case → camelCase` boundary; `lib/env.ts` is the only
file that reads `process.env`. The guest page is ISR-cached hourly, but
every dashboard save calls `revalidatePath("/")` — so the cache is a CDN
optimization, never a staleness bug.

The platform goal shaped the schema from day one: everything hangs off
`wedding_id`, and the deployment picks its wedding by slug. Even the RSVP
form is data — per-field visibility, requiredness, labels, meal options,
and party-size limits live in configuration tables, with code defaults so
an untouched install renders the originally designed form pixel for pixel.
Identity fields are *locked* in code on both the write and read paths,
because a configurable form must not be configurable into breaking
duplicate detection.

## The Technical Challenges

**Exactly-once email in a serverless world.** "Confirming a guest sends a
confirmation" is easy; "…exactly once, even when two clicks race, even when
SMTP is down, without ever rolling back the status change" is the actual
requirement. The status-change action reads the email tracking state
*before* writing the status, so the once-only decision can't race its own
update; a dedicated resend action is the only path that sends after a
success; and outcomes land in four audit columns on the RSVP row (status,
timestamp, SMTP message id, last error) that the dashboard surfaces.

**Never punishing the guest for the couple's email problems.** The
new-RSVP notification to the couple is scheduled with Next.js `after()` —
it runs after the guest's response is already sent — and the notification
service is written to never throw. The RSVP is saved, the guest sees
success, and an SMTP outage is a log line, not a lost response.

**Email HTML is 2004 forever.** The site's design system (Cormorant
serif, gold hairlines, ivory cards) had to survive Gmail, Outlook, and
Apple Mail. The answer was a small template kit — table layout, fully
inlined CSS, web-safe font stacks, border-based "bulletproof" buttons —
whose pure functions (`monogram`, `infoCard`, `buttons`, `layout`…) compose
into every email, so the confirmation and the notification share one
visual language with the website.

**Surviving migration drift.** Code and schema don't deploy atomically.
Services treat post-initial tables and columns as optional with explicit
fallbacks, and the CRUD layer translates the whole "missing table/column"
error family (Postgres `42P01`/`42703`, PostgREST `PGRST204`/`PGRST205`)
into one actionable message: *run the latest migrations.* A database one
migration behind degrades politely instead of taking the site down.

## Key Features

- Config-driven guest RSVP with per-field validation that honors the
  couple's stored form configuration and preserves everything the guest
  typed on a failed submit
- Nine-page dashboard: content editors with drag-to-reorder, optimistic
  status updates with rollback, search / filters / CSV export over
  responses, and a per-response email audit panel
- Three email flows (guest confirmation, couple notification, test email)
  through one mailer with human-readable, secret-free error translation
- Calendar integration twice over: a prefilled Google Calendar link and an
  RFC 5545 `.ics` route, both TZID-anchored so 4:00 PM means 4:00 PM in
  Manila
- Defense-in-depth auth: route guard (validating the JWT, not trusting
  cookies), layout re-verification, RLS, and a client watcher that returns
  long-idle tabs to the login screen before their saves start failing

## Interesting Bugs Solved

**The database in the mail merge.** Guest-facing email links are built
from a configured public site URL — and email verification surfaced footer
links that a mis-pasted environment variable had pointed at the *Supabase
project URL* instead of the wedding website, invisible until real mail
rendered. The fix went beyond correcting the variable: the site-URL
resolver now structurally *refuses* any Supabase hostname as the public
site URL and falls back through Vercel's production URL to the request
origin. The class of bug is dead, not just this instance.

**The update that succeeded at updating nothing.** Row Level Security has
a quiet failure mode: it doesn't error on rows you aren't allowed to
touch, it silently filters them — so a dashboard save hitting a
mis-permissioned or pre-migration row "succeeds" while changing nothing,
and Postgres considers that fine. The CRUD helpers now request exact counts
and treat `count === 0` as a failure with a migration/permissions hint.
Silent no-ops became loud, diagnosable errors.

**Gmail ate the test emails.** Repeated test sends with identical subjects
get threaded by Gmail into a single conversation — every new test hides
under the first, looking exactly like mail that never arrived. The test
email now carries a per-send timestamp in its subject. A tiny fix, but the kind that saves an
hour of SMTP debugging that isn't SMTP.

**The form that forgot.** React 19 resets uncontrolled inputs after every
server action, so any guest who failed validation once watched their whole
RSVP vanish. The action now echoes all submitted values back through its
typed state, and the form re-primes from them — an invisible feature that
is the difference between "quick fix" and "guest gives up."

## Lessons Learned

1. **Put invariants where they can't race.** The one-RSVP-per-email rule is
   a unique index on `(wedding_id, lower(email))`; the app merely
   translates error `23505` into friendly copy. Application-level checks
   would eventually have raced.
2. **Side effects are second-class citizens — enforce it.** Everything
   after "the row is saved" (emails, tracking writes) is isolated so its
   failure is recorded, surfaced, and retryable but never contaminates the
   primary action. `after()`, typed results instead of exceptions, and
   read-before-write once-only checks are the whole toolkit.
3. **Error messages are UX for operators.** Mapping PostgREST error codes
   to "run the latest migrations", and SMTP `EAUTH` to "use a Gmail App
   Password in SMTP_PASS", turned the two most likely production incidents
   into self-service fixes.
4. **Configurability needs a spine.** A fully couple-editable form only
   works because three fields are non-negotiable in code. Decide what must
   never be configurable before making everything else configurable.
5. **Verify through the front door.** Every milestone was tested as the
   real actors: submit the form as a guest, watch the server logs, open the
   email, click its button. The mis-pasted-URL bug was only ever going to
   be caught by reading an actual email.

## Final Outcome

The platform is **production-complete and verified end-to-end**: guests
RSVP on a page that feels like an invitation; Hazel and Jhonel get notified
within seconds, review responses in their dashboard, and confirm guests
with one click that sends a designed confirmation email — exactly once,
with a visible audit trail and a resend button for real life. Content
edits publish instantly. TypeScript is strict and clean, the build is
green, and the documentation set (architecture, database, dashboard, email
system, user guide, changelog) ships with the code — written so the next
maintainer, six months from now, starts from understanding instead of
archaeology.

And when the next couple asks: it's a seed file, not a rewrite.

---

*Stack: Next.js 16 (App Router, Server Actions, ISR) · React 19 ·
TypeScript · Tailwind CSS v4 · Supabase (Postgres, RLS, Auth) · Nodemailer
+ Gmail SMTP · Vercel*
