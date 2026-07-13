import type { RsvpInput, Wedding } from "@/types/wedding";
import {
  buttons,
  divider,
  dividerLine,
  escapeHtml,
  eyebrow,
  infoCard,
  layout,
  monogram,
  palette,
  serif,
  sans,
  type RenderedEmail,
} from "../template-kit";

interface NewRsvpProps {
  wedding: Wedding;
  rsvp: RsvpInput;
  /** ISO instant of the submission. */
  submittedAt: string;
  siteUrl: string;
}

const ATTENDANCE_LABELS: Record<RsvpInput["attendance"], string> = {
  attending: "Accepts with pleasure",
  declining: "Regretfully declines",
};

/** "2026-07-14T12:45:00Z" → "July 14, 2026 at 8:45 PM" in the wedding's timezone. */
function formatSubmittedAt(isoInstant: string, timezone: string): string {
  const date = new Date(isoInstant);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    // An unrecognised timezone must never break the notification.
    return date.toUTCString();
  }
}

/** Italic serif pull-quote for the guest's personal message. */
function messageBlock(label: string, message: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:24px 40px 10px;">${eyebrow(label, palette.stone)}</td></tr>
    <tr>
      <td align="center" style="padding:0 56px;font-family:${serif};font-style:italic;font-size:16px;color:${palette.charcoal};line-height:1.8;">
        &ldquo;${escapeHtml(message)}&rdquo;
      </td>
    </tr>
  </table>`;
}

/**
 * The internal "New RSVP received" notification — sent to the couple, never
 * to guests. Same stationery as the confirmation email, but written for
 * review: the guest's answers up front and one path into the dashboard.
 */
export function renderNewRsvpNotification(props: NewRsvpProps): RenderedEmail {
  const { wedding, rsvp, submittedAt, siteUrl } = props;
  const guestName = `${rsvp.firstName} ${rsvp.lastName}`;
  const initials = `${wedding.brideName[0]} · ${wedding.groomName[0]}`;
  const attendanceLabel = ATTENDANCE_LABELS[rsvp.attendance];
  const submitted = formatSubmittedAt(submittedAt, wedding.timezone);
  const dashboardUrl = `${siteUrl}/dashboard/rsvps`;

  const detailRows = [
    { label: "Guest", value: guestName },
    { label: "Attendance", value: attendanceLabel },
    { label: "Guest Count", value: String(rsvp.guestCount) },
    ...(rsvp.mealPreference ? [{ label: "Meal", value: rsvp.mealPreference }] : []),
    ...(rsvp.plusOneName ? [{ label: "Plus One", value: rsvp.plusOneName }] : []),
    ...(rsvp.songRequest ? [{ label: "Song Request", value: rsvp.songRequest }] : []),
    { label: "Submitted", value: submitted },
  ];

  const body = `
  ${monogram(initials)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:10px 40px 6px;">${eyebrow("New RSVP received")}</td></tr>
    <tr>
      <td align="center" style="padding:6px 40px 14px;font-family:${serif};font-size:30px;color:${palette.charcoal};line-height:1.3;">
        ${escapeHtml(guestName)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 48px 8px;font-family:${sans};font-size:14px;color:${palette.charcoal};line-height:1.8;">
        A new RSVP has been submitted and is waiting for your review.
      </td>
    </tr>
  </table>

  ${divider()}

  ${infoCard(detailRows)}

  ${rsvp.message ? messageBlock("Special Message", rsvp.message) : ""}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 0 4px;">${buttons([
      { label: "Review RSVP", url: dashboardUrl, variant: "solid" },
    ])}</td></tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:28px 0 12px;">${dividerLine()}</td></tr>
    <tr>
      <td align="center" style="padding:4px 40px 40px;font-family:${sans};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${palette.stone};">
        ${escapeHtml(wedding.brideName)} &amp; ${escapeHtml(wedding.groomName)} Wedding Dashboard
      </td>
    </tr>
  </table>`;

  const subject = `🎉 New RSVP Received — ${guestName}`;

  const text = [
    "A new RSVP has been submitted and is waiting for your review.",
    "",
    `Guest: ${guestName}`,
    `Attendance: ${attendanceLabel}`,
    `Guest Count: ${rsvp.guestCount}`,
    ...(rsvp.mealPreference ? [`Meal: ${rsvp.mealPreference}`] : []),
    ...(rsvp.plusOneName ? [`Plus One: ${rsvp.plusOneName}`] : []),
    ...(rsvp.songRequest ? [`Song Request: ${rsvp.songRequest}`] : []),
    ...(rsvp.message ? [`Special Message: "${rsvp.message}"`] : []),
    `Submitted: ${submitted}`,
    "",
    `Review RSVP: ${dashboardUrl}`,
    "",
    `${wedding.brideName} & ${wedding.groomName} Wedding Dashboard`,
  ].join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: `${guestName} — ${attendanceLabel.toLowerCase()}, party of ${rsvp.guestCount}.`,
      body,
    }),
    text,
  };
}
