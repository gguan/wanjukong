import { escapeHtml, renderHeading, renderLayout } from './shared/layout';

export interface ContactForwardParams {
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
  orderNumber?: string | null;
  locale: string;
  submittedAt: Date;
}

function renderRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#313131;word-break:break-word;">${escapeHtml(value)}</td>
    </tr>
  `;
}

/**
 * Internal staff-facing forward. English-only by design — this goes to the
 * support inbox, not the customer. `replyTo` is set to the customer's email
 * at the transport level so staff can hit "Reply" directly.
 */
export function getContactForwardEmail(
  params: ContactForwardParams,
): { subject: string; html: string } {
  const subject = `[Contact] ${params.subject}`;

  const rows = [
    renderRow('From', `${params.fromName} <${params.fromEmail}>`),
    ...(params.orderNumber
      ? [renderRow('Order #', params.orderNumber)]
      : []),
    renderRow('Locale', params.locale),
    renderRow('Submitted', params.submittedAt.toISOString()),
  ].join('');

  const body = `
    ${renderHeading('New contact form submission')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
      ${rows}
    </table>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;">Message</p>
    <div style="padding:14px 16px;border-left:3px solid #ebebeb;font-size:14px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${escapeHtml(params.message)}</div>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">Reply directly to this email to reach the customer.</p>
  `;

  return {
    subject,
    html: renderLayout({
      locale: 'en',
      title: subject,
      bodyHtml: body,
    }),
  };
}
