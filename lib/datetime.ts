/** Date/time formatting helpers. The wedding stores naive local date + time
 * plus an IANA timezone; these helpers keep display consistent. */

/** "16:00" → "4:00 PM" */
export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "2026-11-30" → "Monday, November 30, 2026" (or parts of it) */
export function formatLongDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  },
): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  // Noon UTC avoids the date shifting in any display timezone.
  const date = new Date(Date.UTC(y, mo - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}

/** UTC offsets for supported venue timezones. Manila has no DST. */
const TIMEZONE_OFFSETS: Record<string, string> = {
  "Asia/Manila": "+08:00",
};

/** Absolute instant of the ceremony, for the countdown. */
export function toInstantIso(
  isoDate: string,
  time24: string,
  timezone: string,
): string {
  const offset = TIMEZONE_OFFSETS[timezone] ?? "+00:00";
  return `${isoDate}T${time24}:00${offset}`;
}

/** Google Maps directions link for a venue. */
export function mapsUrl(venue: string, addressLines: string[]): string {
  const query = encodeURIComponent([venue, ...addressLines].join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
