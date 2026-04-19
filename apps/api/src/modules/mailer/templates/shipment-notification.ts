import type { SupportedLocale } from '../locale.util';
import { escapeHtml, renderButton, renderLayout } from './shared/layout';

interface Params {
  name: string | null;
  orderNo: string;
  carrierLabel: string;
  trackingNumber: string;
  trackingUrl?: string;
}

interface Strings {
  subject: (orderNo: string) => string;
  preheader: (orderNo: string) => string;
  heading: string;
  greetingAnon: string;
  greetingWithName: (name: string) => string;
  intro: (orderNo: string) => string;
  carrierLabel: string;
  trackingLabel: string;
  cta: string;
  footer: string;
}

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: (no) => `Your order ${no} has shipped`,
    preheader: (no) => `Order ${no} is on its way.`,
    heading: 'Your order is on the way',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro: (no) => `Great news! Your order ${escapeHtml(no)} has been shipped.`,
    carrierLabel: 'Carrier',
    trackingLabel: 'Tracking Number',
    cta: 'Track Your Package',
    footer: 'If you have any questions, please reply to this email.',
  },
  ja: {
    subject: (no) => `ご注文 ${no} を発送しました`,
    preheader: (no) => `ご注文 ${no} はお客様のもとへ向かっています。`,
    heading: 'ご注文を発送しました',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro: (no) => `ご注文 ${escapeHtml(no)} を発送いたしました。`,
    carrierLabel: '配送業者',
    trackingLabel: '追跡番号',
    cta: '配送状況を確認する',
    footer: 'ご不明な点がございましたら、このメールにご返信ください。',
  },
  'zh-CN': {
    subject: (no) => `您的订单 ${no} 已发货`,
    preheader: (no) => `您的订单 ${no} 已寄出。`,
    heading: '您的订单已发货',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: (no) => `好消息！您的订单 ${escapeHtml(no)} 已发货。`,
    carrierLabel: '承运商',
    trackingLabel: '运单号',
    cta: '查询物流',
    footer: '如有任何问题，请直接回复此邮件。',
  },
  'zh-TW': {
    subject: (no) => `您的訂單 ${no} 已出貨`,
    preheader: (no) => `您的訂單 ${no} 已寄出。`,
    heading: '您的訂單已出貨',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: (no) => `好消息！您的訂單 ${escapeHtml(no)} 已出貨。`,
    carrierLabel: '物流業者',
    trackingLabel: '追蹤號碼',
    cta: '查詢物流',
    footer: '如有任何問題，請直接回覆此郵件。',
  },
};

export function getShipmentNotificationEmail(
  locale: SupportedLocale,
  params: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const { name, orderNo, carrierLabel, trackingNumber, trackingUrl } = params;
  const greeting = name?.trim() ? t.greetingWithName(name.trim()) : t.greetingAnon;

  const trackingDisplay = trackingUrl
    ? `<a href="${trackingUrl}" style="color:#18181b;text-decoration:underline;font-weight:600;">${escapeHtml(trackingNumber)}</a>`
    : `<strong>${escapeHtml(trackingNumber)}</strong>`;

  const body = `
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;line-height:1.3;color:#0a0a0a;">${escapeHtml(t.heading)}</h1>
    <p style="margin:0 0 8px;font-size:16px;color:#18181b;">${greeting}</p>
    <p style="margin:0 0 24px;font-size:16px;color:#18181b;">${t.intro(orderNo)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.carrierLabel)}</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#18181b;">${escapeHtml(carrierLabel)}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.trackingLabel)}</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${trackingDisplay}</p>
        </td>
      </tr>
    </table>
    ${trackingUrl ? renderButton(trackingUrl, t.cta) : ''}
    <p style="margin:0;font-size:14px;color:#71717a;">${escapeHtml(t.footer)}</p>
  `;

  const subject = t.subject(orderNo);
  return {
    subject,
    html: renderLayout({
      locale,
      title: subject,
      preheader: t.preheader(orderNo),
      bodyHtml: body,
    }),
  };
}
