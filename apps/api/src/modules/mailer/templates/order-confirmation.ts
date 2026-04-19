import type { SupportedLocale } from '../locale.util';
import { escapeHtml, renderButton, renderLayout } from './shared/layout';

interface OrderItem {
  productNameSnapshot: string;
  variantNameSnapshot?: string | null;
  skuSnapshot?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

interface Params {
  name: string | null;
  orderNo: string;
  items: OrderItem[];
  totalPriceCents: number;
  currency: string;
  orderUrl: string;
}

interface Strings {
  subject: (orderNo: string) => string;
  preheader: (orderNo: string) => string;
  heading: string;
  greetingAnon: string;
  greetingWithName: (name: string) => string;
  intro: string;
  orderNumberLabel: string;
  skuLabel: string;
  totalLabel: string;
  cta: string;
  footer: string;
}

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: (no) => `Order confirmed — ${no}`,
    preheader: (no) => `Your order ${no} has been received.`,
    heading: 'Thanks for your order',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro: "Thank you for your order! We've received your purchase and it's being processed.",
    orderNumberLabel: 'Order Number',
    skuLabel: 'SKU',
    totalLabel: 'Total',
    cta: 'View Order',
    footer: 'If you have any questions about your order, please reply to this email.',
  },
  ja: {
    subject: (no) => `ご注文確認 — ${no}`,
    preheader: (no) => `ご注文 ${no} を承りました。`,
    heading: 'ご注文ありがとうございます',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro: 'ご注文を承りました。まもなく処理を開始いたします。',
    orderNumberLabel: '注文番号',
    skuLabel: 'SKU',
    totalLabel: '合計',
    cta: '注文を確認する',
    footer: 'ご不明な点がございましたら、このメールにご返信ください。',
  },
  'zh-CN': {
    subject: (no) => `订单已确认 — ${no}`,
    preheader: (no) => `我们已收到您的订单 ${no}。`,
    heading: '感谢您的下单',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '感谢您的订购！我们已收到您的订单，正在为您处理。',
    orderNumberLabel: '订单编号',
    skuLabel: '货号',
    totalLabel: '合计',
    cta: '查看订单',
    footer: '如对订单有任何疑问，请直接回复此邮件。',
  },
  'zh-TW': {
    subject: (no) => `訂單已確認 — ${no}`,
    preheader: (no) => `我們已收到您的訂單 ${no}。`,
    heading: '感謝您的下單',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '感謝您的訂購！我們已收到您的訂單，正在為您處理。',
    orderNumberLabel: '訂單編號',
    skuLabel: '貨號',
    totalLabel: '合計',
    cta: '查看訂單',
    footer: '如對訂單有任何疑問，請直接回覆此郵件。',
  },
};

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function getOrderConfirmationEmail(
  locale: SupportedLocale,
  params: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const { name, orderNo, items, totalPriceCents, currency, orderUrl } = params;
  const greeting = name?.trim() ? t.greetingWithName(name.trim()) : t.greetingAnon;

  const itemRows = items
    .map((item) => {
      const label = item.variantNameSnapshot
        ? `${escapeHtml(item.productNameSnapshot)} — ${escapeHtml(item.variantNameSnapshot)}`
        : escapeHtml(item.productNameSnapshot);
      const skuLine = item.skuSnapshot
        ? `<br/><span style="font-size:12px;color:#71717a;">${escapeHtml(t.skuLabel)}: ${escapeHtml(item.skuSnapshot)}</span>`
        : '';
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
            <span style="font-size:14px;color:#18181b;">${label}</span>
            ${skuLine}
          </td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;font-size:14px;color:#18181b;">
            ${item.quantity} × ${formatMoney(item.unitPriceCents, currency)}
          </td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;font-size:14px;font-weight:600;color:#18181b;">
            ${formatMoney(item.totalPriceCents, currency)}
          </td>
        </tr>`;
    })
    .join('');

  const body = `
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;line-height:1.3;color:#0a0a0a;">${escapeHtml(t.heading)}</h1>
    <p style="margin:0 0 8px;font-size:16px;color:#18181b;">${greeting}</p>
    <p style="margin:0 0 24px;font-size:16px;color:#18181b;">${escapeHtml(t.intro)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.orderNumberLabel)}</p>
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#18181b;letter-spacing:0.02em;">${escapeHtml(orderNo)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:12px 0 0;text-align:right;font-size:14px;color:#71717a;">${escapeHtml(t.totalLabel)}</td>
        <td style="padding:12px 0 0 16px;text-align:right;font-size:16px;font-weight:700;color:#18181b;">${formatMoney(totalPriceCents, currency)}</td>
      </tr>
    </table>
    ${renderButton(orderUrl, t.cta)}
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
