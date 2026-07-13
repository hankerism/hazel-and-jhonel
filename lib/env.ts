/** Centralised environment access. Nothing else reads process.env directly. */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  /** Server-side only. Bypasses RLS; reserved for future admin features. */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  /** Which wedding this deployment serves. */
  weddingSlug: process.env.WEDDING_SLUG ?? "hazel-and-jhonel",
  /** Public base URL of the deployed site (falls back to request origin). */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  /** Set automatically by Vercel: the project's production hostname. */
  vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  /** Overrides where new-RSVP notifications go. Resolution (including the
   * default recipient) lives in services/email/notification-service. */
  rsvpNotificationEmail: process.env.RSVP_NOTIFICATION_EMAIL,
  /** SMTP — server-side only, never reaches the client bundle. */
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    replyTo: process.env.SMTP_REPLY_TO,
  },
} as const;

export function isSmtpConfigured(): boolean {
  const { host, port, user, pass, fromEmail } = env.smtp;
  return Boolean(host && port && user && pass && fromEmail);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
