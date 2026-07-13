import { formatLongDate, formatTime12h } from "@/lib/datetime";
import { googleCalendarUrl } from "@/lib/calendar";
import type { RsvpRecord, Wedding } from "@/types/wedding";
import {
  buttons,
  divider,
  escapeHtml,
  eyebrow,
  footer,
  hero,
  infoCard,
  layout,
  monogram,
  palette,
  serif,
  sans,
} from "../template-kit";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface ConfirmationProps {
  wedding: Wedding;
  guest: Pick<
    RsvpRecord,
    "firstName" | "lastName" | "guestCount" | "mealPreference" | "plusOneName"
  >;
  websiteUrl: string;
}

/**
 * The RSVP confirmation email — a printed invitation in inbox form.
 * Monogram, optional hero photograph, personal note, detail card,
 * calendar buttons, and the couple's signature.
 */
export function renderConfirmationEmail(props: ConfirmationProps): RenderedEmail {
  const { wedding, guest, websiteUrl } = props;
  const coupleNames = `${wedding.brideName} & ${wedding.groomName}`;
  const initials = `${wedding.brideName[0]} · ${wedding.groomName[0]}`;
  const longDate = formatLongDate(wedding.weddingDate);
  // Email clients need absolute URLs — anchor a site-relative hero
  // (e.g. an uploaded /images/… path) to the public site.
  const heroUrl = wedding.heroImage
    ? wedding.heroImage.startsWith("http")
      ? wedding.heroImage
      : `${websiteUrl}${wedding.heroImage}`
    : null;

  const detailRows = [
    { label: "Guest", value: `${guest.firstName} ${guest.lastName}` },
    { label: "RSVP Status", value: "Confirmed" },
    { label: "Date", value: longDate },
    { label: "Ceremony", value: formatTime12h(wedding.ceremonyTime) },
    { label: "Reception", value: formatTime12h(wedding.receptionTime) },
    { label: "Venue", value: wedding.ceremonyVenue },
    { label: "Dress Code", value: wedding.dressCode },
    {
      label: "Guests",
      value: `${guest.guestCount} ${guest.guestCount === 1 ? "seat" : "seats"}`,
    },
    ...(guest.mealPreference
      ? [{ label: "Meal Selection", value: guest.mealPreference }]
      : []),
    ...(guest.plusOneName
      ? [{ label: "Plus One", value: guest.plusOneName }]
      : []),
  ];

  const body = `
  ${monogram(initials)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:10px 40px 6px;">${eyebrow("Your RSVP is confirmed")}</td></tr>
    <tr>
      <td align="center" style="padding:6px 40px 22px;font-family:${serif};font-size:30px;color:${palette.charcoal};line-height:1.3;">
        ${escapeHtml(coupleNames)}
      </td>
    </tr>
  </table>

  ${heroUrl ? hero(heroUrl, coupleNames) : ""}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:30px 48px 0;font-family:${serif};font-size:17px;color:${palette.charcoal};line-height:1.75;">
        Dear ${escapeHtml(guest.firstName)},
      </td>
    </tr>
    <tr>
      <td style="padding:16px 48px 0;font-family:${sans};font-size:14px;color:${palette.charcoal};line-height:1.8;">
        We're delighted to let you know that your RSVP has officially been
        confirmed. Thank you for taking the time to respond.
      </td>
    </tr>
    <tr>
      <td style="padding:14px 48px 0;font-family:${sans};font-size:14px;color:${palette.charcoal};line-height:1.8;">
        We truly can't wait to celebrate one of the most meaningful days of
        our lives with you. Having you with us means the world.
      </td>
    </tr>
  </table>

  ${divider()}

  ${infoCard(detailRows)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 0 4px;">${buttons([
      { label: "View Wedding Website", url: websiteUrl, variant: "solid" },
      { label: "Add to Google Calendar", url: googleCalendarUrl(wedding) },
      { label: "Download Calendar (.ics)", url: `${websiteUrl}/calendar.ics` },
    ])}</td></tr>
  </table>

  ${footer({
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    websiteUrl,
  })}`;

  const subject = `Your RSVP is confirmed — ${coupleNames}, ${longDate}`;

  const text = [
    `Dear ${guest.firstName},`,
    "",
    "We're delighted to let you know that your RSVP has officially been confirmed. Thank you for taking the time to respond.",
    "",
    "We truly can't wait to celebrate one of the most meaningful days of our lives with you. Having you with us means the world.",
    "",
    `Guest: ${guest.firstName} ${guest.lastName}`,
    "RSVP Status: Confirmed",
    `Date: ${longDate}`,
    `Ceremony: ${formatTime12h(wedding.ceremonyTime)}`,
    `Reception: ${formatTime12h(wedding.receptionTime)}`,
    `Venue: ${wedding.ceremonyVenue}`,
    `Dress Code: ${wedding.dressCode}`,
    `Guests: ${guest.guestCount}`,
    ...(guest.mealPreference ? [`Meal Selection: ${guest.mealPreference}`] : []),
    ...(guest.plusOneName ? [`Plus One: ${guest.plusOneName}`] : []),
    "",
    `Wedding website: ${websiteUrl}`,
    `Add to Google Calendar: ${googleCalendarUrl(wedding)}`,
    `Download calendar: ${websiteUrl}/calendar.ics`,
    "",
    "With love,",
    wedding.brideName,
    "&",
    wedding.groomName,
    "",
    "Reply directly to this email if you have any questions.",
  ].join("\n");

  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Dear ${guest.firstName}, your RSVP for ${coupleNames}'s wedding on ${longDate} is confirmed.`,
      body,
    }),
    text,
  };
}
