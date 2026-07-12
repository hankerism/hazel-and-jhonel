import type { Wedding } from "@/types/wedding";

/** Calendar helpers shared by the public .ics route and email templates. */

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-30" + "16:00" → "20261130T160000" (floating local time). */
function compact(isoDate: string, time24: string): string {
  return `${isoDate.replaceAll("-", "")}T${time24.replace(":", "")}00`;
}

/** Event window: ceremony start until midnight (the published schedule
 * runs to a 12:00 AM closing). */
function eventWindow(wedding: Wedding): { start: string; end: string } {
  const [y, m, d] = wedding.weddingDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDate = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return {
    start: compact(wedding.weddingDate, wedding.ceremonyTime),
    end: compact(nextDate, "00:00"),
  };
}

function eventBasics(wedding: Wedding) {
  return {
    title: `${wedding.brideName} & ${wedding.groomName} — Wedding`,
    description: wedding.welcomeMessage,
    location: [wedding.ceremonyVenue, ...wedding.ceremonyAddress].join(", "),
  };
}

/** Prefilled Google Calendar "add event" link. */
export function googleCalendarUrl(wedding: Wedding): string {
  const { start, end } = eventWindow(wedding);
  const { title, description, location } = eventBasics(wedding);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    ctz: wedding.timezone,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 .ics document (Apple Calendar, Outlook, etc.). */
export function buildIcs(wedding: Wedding): string {
  const { start, end } = eventWindow(wedding);
  const { title, description, location } = eventBasics(wedding);
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Platform//RSVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:wedding-${wedding.slug}@${wedding.slug}`,
    `DTSTAMP:${compact(wedding.weddingDate, "00:00")}Z`,
    `DTSTART;TZID=${wedding.timezone}:${start}`,
    `DTEND;TZID=${wedding.timezone}:${end}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    `LOCATION:${escape(location)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
