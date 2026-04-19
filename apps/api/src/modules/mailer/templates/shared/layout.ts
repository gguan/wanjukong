import { htmlLangAttr, type SupportedLocale } from '../../locale.util';

/**
 * Shared HTML wrapper for transactional emails. All templates call this so we
 * style the chrome (card, button, preheader, footer) in exactly one place.
 *
 * Email HTML has to be table-based and inline-styled — ignore how much it
 * looks like 2005 web design. Clients that matter (Gmail, Outlook, Apple Mail)
 * won't render flex/grid or external stylesheets reliably.
 */
export interface LayoutParams {
  locale: SupportedLocale;
  title: string;
  /** Hidden text that Gmail-style clients show as the preview line. */
  preheader?: string;
  /** Main HTML body; already escaped / controlled by the caller. */
  bodyHtml: string;
  /** Optional small-text footer under the card (e.g., help link, brand). */
  footerHtml?: string;
}

export function renderLayout(params: LayoutParams): string {
  const { locale, title, preheader = '', bodyHtml, footerHtml } = params;
  return `<!DOCTYPE html>
<html lang="${htmlLangAttr(locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${
    preheader
      ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
      : ''
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
        ${
          footerHtml
            ? `<table role="presentation" width="480" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 32px;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">${footerHtml}</td></tr></table>`
            : ''
        }
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/** Render the canonical black-on-white CTA button. */
export function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:6px;background-color:#18181b;">
      <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
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
