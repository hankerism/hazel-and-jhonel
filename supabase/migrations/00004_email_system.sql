-- ============================================================================
-- Migration 00004: Email system
--
-- Confirmation-email tracking on rsvps. Idempotent; touches no data.
-- Run AFTER 00003.
-- ============================================================================

alter table public.rsvps
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_status text,
  add column if not exists confirmation_email_message_id text,
  add column if not exists confirmation_email_error text;

-- 'sent' = accepted by the SMTP server; 'failed' = last attempt errored;
-- null = never attempted.
alter table public.rsvps drop constraint if exists rsvps_confirmation_email_status_check;
alter table public.rsvps
  add constraint rsvps_confirmation_email_status_check
  check (
    confirmation_email_status is null
    or confirmation_email_status in ('sent', 'failed')
  );
