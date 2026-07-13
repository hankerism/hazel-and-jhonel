/**
 * Reusable building blocks for the platform's emails — the email-safe
 * translation of the website's design system. Every future template
 * (reminders, wedding-day, thank-you) composes these.
 *
 * Constraints honored throughout: table-based layout, fully inlined CSS,
 * web-safe font stacks (Georgia ≈ the site's serif, Helvetica for body),
 * no external stylesheets, no scripts — renders in Gmail, Apple Mail,
 * Outlook, and Yahoo.
 */

/** What every template renders to — ready to hand to the mailer. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const palette = {
  ivory: "#faf8f5",
  parchment: "#f2ede5",
  charcoal: "#26231f",
  ink: "#1a1815",
  gold: "#a9885a",
  goldDeep: "#8c6f45",
  stone: "#857f75",
  line: "#e6dfd3",
} as const;

export const serif = "Georgia, 'Times New Roman', serif";
export const sans = "Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Letterspaced small-caps label — the email twin of the site's eyebrow. */
export function eyebrow(text: string, color: string = palette.gold): string {
  return `<p style="margin:0;font-family:${sans};font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`;
}

/** Serif monogram crowned with hairlines: — H & J — */
export function monogram(initials: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:36px 0 8px;">
        <span style="font-family:${serif};font-size:28px;letter-spacing:6px;color:${palette.charcoal};">${escapeHtml(initials)}</span>
      </td>
    </tr>
    <tr><td align="center" style="padding:0 0 4px;">${dividerLine(48)}</td></tr>
  </table>`;
}

/** Thin gold rule, centered. */
export function dividerLine(width: number = 64): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;"><tr><td style="border-top:1px solid ${palette.gold};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** Full divider block with breathing room. */
export function divider(): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:28px 0;">${dividerLine()}</td></tr>
  </table>`;
}

/** Optional hero photograph, softly rounded. */
export function hero(imageUrl: string, alt: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:8px 40px 0;">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:4px;" />
      </td>
    </tr>
  </table>`;
}

/** Bordered ivory card of label/value rows. */
export function infoCard(rows: { label: string; value: string }[]): string {
  const body = rows
    .map(
      ({ label, value }, i) => `
      <tr>
        <td style="padding:12px 24px;border-top:${i === 0 ? "none" : `1px solid ${palette.line}`};font-family:${sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${palette.stone};white-space:nowrap;">${escapeHtml(label)}</td>
        <td align="right" style="padding:12px 24px;border-top:${i === 0 ? "none" : `1px solid ${palette.line}`};font-family:${serif};font-size:15px;color:${palette.charcoal};">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:4px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${palette.line};border-radius:4px;background-color:#ffffff;">
          ${body}
        </table>
      </td>
    </tr>
  </table>`;
}

interface ButtonSpec {
  label: string;
  url: string;
  variant?: "solid" | "outline";
}

/** Centered stack of bulletproof buttons (border-based, Outlook-safe). */
export function buttons(specs: ButtonSpec[]): string {
  const items = specs
    .map(({ label, url, variant = "outline" }) => {
      const solid = variant === "solid";
      return `
      <tr>
        <td align="center" style="padding:6px 0;">
          <a href="${escapeHtml(url)}" target="_blank"
             style="display:inline-block;min-width:220px;padding:13px 32px;font-family:${sans};font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border-radius:2px;text-align:center;${
               solid
                 ? `background-color:${palette.charcoal};color:${palette.ivory};border:1px solid ${palette.charcoal};`
                 : `background-color:transparent;color:${palette.goldDeep};border:1px solid ${palette.gold};`
             }">${escapeHtml(label)}</a>
        </td>
      </tr>`;
    })
    .join("");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${items}
  </table>`;
}

/** Signature footer + reply note + website link. */
export function footer(options: {
  brideName: string;
  groomName: string;
  websiteUrl: string;
}): string {
  const { brideName, groomName, websiteUrl } = options;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:32px 0 12px;">${dividerLine()}</td></tr>
    <tr>
      <td align="center" style="padding:8px 40px 0;font-family:${serif};font-style:italic;font-size:15px;color:${palette.stone};">With love,</td>
    </tr>
    <tr>
      <td align="center" style="padding:12px 40px 0;font-family:${serif};font-size:22px;color:${palette.charcoal};line-height:1.5;">
        ${escapeHtml(brideName)}<br/>
        <span style="color:${palette.gold};font-style:italic;">&amp;</span><br/>
        ${escapeHtml(groomName)}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:24px 40px 6px;font-family:${sans};font-size:12px;color:${palette.stone};line-height:1.6;">
        Reply directly to this email if you have any questions.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 40px 40px;">
        <a href="${escapeHtml(websiteUrl)}" target="_blank" style="font-family:${sans};font-size:12px;color:${palette.goldDeep};text-decoration:underline;">Visit our wedding website</a>
      </td>
    </tr>
  </table>`;
}

/** The outer shell: ivory canvas, centered 600px card. */
export function layout(options: {
  title: string;
  preheader: string;
  body: string;
}): string {
  const { title, preheader, body } = options;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${palette.parchment};">
  <!-- Preheader: inbox preview text, invisible in the email body. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.parchment};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:${palette.ivory};border:1px solid ${palette.line};border-radius:6px;">
          <tr><td>${body}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
