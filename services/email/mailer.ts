import nodemailer, { type Transporter } from "nodemailer";
import { env, isSmtpConfigured } from "@/lib/env";

/**
 * The platform's one SMTP door. Server-side only — imported exclusively by
 * server actions and services; credentials never leave the server.
 *
 * Every send returns a typed result. Errors are translated into messages
 * safe to show the couple (no hosts, no credentials) while the raw cause is
 * logged server-side.
 */

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative for clients that prefer it. */
  text: string;
}

let transporter: Transporter | null = null;

export function getEmailConfigStatus(): { configured: boolean } {
  return { configured: isSmtpConfigured() };
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: Number(env.smtp.port),
      secure: env.smtp.secure === "true",
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      // Fail fast instead of hanging a server action on a dead network.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

/** Translate SMTP failures into couple-friendly, secret-free messages. */
function friendlySmtpError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  if (e.code === "EAUTH" || e.responseCode === 535) {
    return "The email account rejected the credentials. For Gmail, use an App Password (not the account password) in SMTP_PASS.";
  }
  if (e.code === "ECONNECTION" || e.code === "ESOCKET" || e.code === "ECONNREFUSED") {
    return "Couldn't reach the email server. Check SMTP_HOST/SMTP_PORT and the network.";
  }
  if (e.code === "ETIMEDOUT" || /timed?\s?out/i.test(e.message ?? "")) {
    return "The email server took too long to respond. Please try again.";
  }
  if (e.responseCode === 550 || e.responseCode === 553) {
    return "The recipient address was rejected by the email server.";
  }
  return "Sending failed unexpectedly. The full error was logged on the server.";
}

/** Verify configuration + connection without sending anything. */
export async function verifySmtpConnection(): Promise<SendResult> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      error:
        "Email isn't configured yet — set the SMTP_* variables in the environment.",
    };
  }
  try {
    await getTransporter().verify();
    return { ok: true, messageId: "" };
  } catch (err) {
    console.error("[mailer] SMTP verify failed:", err);
    return { ok: false, error: friendlySmtpError(err) };
  }
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      error:
        "Email isn't configured yet — set the SMTP_* variables in the environment.",
    };
  }

  try {
    const info = await getTransporter().sendMail({
      from: {
        name: env.smtp.fromName || env.smtp.fromEmail!,
        address: env.smtp.fromEmail!,
      },
      replyTo: env.smtp.replyTo || env.smtp.fromEmail,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mailer] send failed:", err);
    return { ok: false, error: friendlySmtpError(err) };
  }
}
