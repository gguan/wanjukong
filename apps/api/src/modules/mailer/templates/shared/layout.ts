import { htmlLangAttr, type SupportedLocale } from '../../locale.util';

/**
 * Shared HTML wrapper for transactional emails. All templates call this so we
 * style the chrome (card, button, preheader, footer) in exactly one place.
 *
 * Email HTML has to be table-based and inline-styled — ignore how much it
 * looks like 2005 web design. Clients that matter (Gmail, Outlook, Apple Mail)
 * won't render flex/grid or external stylesheets reliably.
 *
 * The one exception is the :hover rule on the CTA button, which we ship in a
 * <style> tag. Gmail/Apple Mail/Outlook.com honor it; clients that strip it
 * fall back to the inline outline style, which is still tappable and legible.
 */

export const BRAND = 'OVER REALM';
export const LOGO_FILENAME = 'logo-circle.png';

const OUTER_BG = '#ebebeb';
const CARD_BG = '#ffffff';
const TEXT = '#313131';
const MUTED = '#71717a';
const DIVIDER = '#ebebeb';
const FONT =
  `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif`;

export interface LayoutParams {
  locale: SupportedLocale;
  title: string;
  /** Hidden text that Gmail-style clients show as the preview line. */
  preheader?: string;
  /** Main HTML body; already escaped / controlled by the caller. */
  bodyHtml: string;
  /** Optional small-text footer under the card (e.g., help link, brand). */
  footerHtml?: string;
  /** Overrides APP_BASE_URL (used for the header logo and link). */
  siteUrl?: string;
}

function resolveSiteUrl(siteUrl?: string): string {
  const raw = siteUrl || process.env.APP_BASE_URL || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export function renderLayout(params: LayoutParams): string {
  const { locale, title, preheader = '', bodyHtml, footerHtml } = params;
  const siteUrl = resolveSiteUrl(params.siteUrl);
  const logoUrl = `${siteUrl}/${LOGO_FILENAME}`;

  return `<!DOCTYPE html>
<html lang="${htmlLangAttr(locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    a.em-btn:hover { background-color: ${TEXT} !important; color: #ffffff !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${OUTER_BG};font-family:${FONT};">
  ${
    preheader
      ? `<div style="display:none;font-size:1px;color:${OUTER_BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
      : ''
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${OUTER_BG};border-top:44px solid ${OUTER_BG};border-bottom:44px solid ${OUTER_BG};table-layout:fixed;">
    <tr>
      <td align="center" valign="top" style="font-size:1em;">
        <table role="presentation" width="594" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARD_BG}" style="background-color:${CARD_BG};max-width:594px;width:100%;">
          <tr>
            <td align="left" valign="middle" style="padding:44px 44px 22px;">
              <a href="${siteUrl}" target="_blank" rel="noopener" style="text-decoration:none;border:0;display:inline-block;">
                <img src="${logoUrl}" alt="${escapeHtml(BRAND)}" width="80" height="80" style="display:block;border:0;width:80px;height:80px;max-width:80px;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:11px 44px 44px;color:${TEXT};font-family:${FONT};">
              ${bodyHtml}
            </td>
          </tr>
          ${
            footerHtml
              ? `<tr>
            <td align="center" style="padding:0 44px;">
              <div style="width:100%;height:0;border-top:1px solid ${DIVIDER};font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 44px 33px;font-size:12px;line-height:1.5;color:${MUTED};font-family:${FONT};text-align:center;">
              ${footerHtml}
            </td>
          </tr>`
              : `<tr><td style="padding:0 44px 22px;">&nbsp;</td></tr>`
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Render the canonical outline CTA button. Renders with the brand's
 * transparent-on-black-border inline style by default; clients that support
 * <style> rules also fill to black-on-white on hover (see em-btn rule above).
 */
export function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;">
  <tr>
    <td align="left">
      <a class="em-btn" href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:16px 36px;background-color:transparent;border:1px solid ${TEXT};color:${TEXT};font-family:${FONT};font-size:11px;font-weight:600;line-height:1;letter-spacing:0.2em;text-decoration:none;text-transform:uppercase;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Heading used at the top of the card body. Kept as a helper so every
 * template picks up the same weight/size without copying inline styles.
 */
export function renderHeading(text: string): string {
  return `<h1 style="margin:0 0 20px;font-weight:400;font-size:24px;line-height:1.25;color:${TEXT};font-family:${FONT};">${escapeHtml(text)}</h1>`;
}

/** Minimal HTML escape for plain-text user-supplied strings. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
