import type { SupportedLocale } from '../locale.util';
import {
  escapeHtml,
  renderButton,
  renderHeading,
  renderLayout,
} from './shared/layout';

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
  payUrl: string;
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
    subject: (no) => `Complete your payment — ${no}`,
    preheader: (no) => `Order ${no} is awaiting payment.`,
    heading: 'Your order is awaiting payment',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro:
      "We've reserved your items but haven't received payment yet. Please complete the payment to confirm your order.",
    orderNumberLabel: 'Order Number',
    skuLabel: 'SKU',
    totalLabel: 'Total Due',
    cta: 'Complete Payment',
    footer:
      'Unpaid orders are automatically cancelled after 30 minutes. If you have any questions, just reply to this email.',
  },
  ja: {
    subject: (no) => `お支払いをお願いします — ${no}`,
    preheader: (no) => `ご注文 ${no} のお支払いをお待ちしています。`,
    heading: 'お支払いをお待ちしています',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro:
      '商品をお取り置きしておりますが、まだお支払いを確認できておりません。お早めにお支払いをお済ませください。',
    orderNumberLabel: '注文番号',
    skuLabel: 'SKU',
    totalLabel: 'お支払い金額',
    cta: 'お支払いに進む',
    footer:
      'お支払いがない場合、30 分後に自動的にキャンセルされます。ご不明な点はこのメールにご返信ください。',
  },
  'zh-CN': {
    subject: (no) => `请尽快完成支付 — ${no}`,
    preheader: (no) => `您的订单 ${no} 等待支付中。`,
    heading: '您的订单等待支付',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '我们已为您保留商品，但尚未收到付款。请尽快完成支付以确认订单。',
    orderNumberLabel: '订单编号',
    skuLabel: '货号',
    totalLabel: '应付金额',
    cta: '前往支付',
    footer: '未支付订单将在 30 分钟后自动取消。如有疑问，请直接回复此邮件。',
  },
  'zh-TW': {
    subject: (no) => `請盡快完成付款 — ${no}`,
    preheader: (no) => `您的訂單 ${no} 等待付款中。`,
    heading: '您的訂單等待付款',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '我們已為您保留商品，但尚未收到付款。請盡快完成付款以確認訂單。',
    orderNumberLabel: '訂單編號',
    skuLabel: '貨號',
    totalLabel: '應付金額',
    cta: '前往付款',
    footer: '未付款訂單將在 30 分鐘後自動取消。如有疑問，請直接回覆此郵件。',
  },
};

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function getOrderPlacedPendingEmail(
  locale: SupportedLocale,
  params: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const { name, orderNo, items, totalPriceCents, currency, payUrl } = params;
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
          <td style="padding:8px 0;border-bottom:1px solid #ebebeb;">
            <span style="font-size:14px;color:#313131;">${label}</span>
            ${skuLine}
          </td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #ebebeb;text-align:right;white-space:nowrap;font-size:14px;color:#313131;">
            ${item.quantity} × ${formatMoney(item.unitPriceCents, currency)}
          </td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #ebebeb;text-align:right;white-space:nowrap;font-size:14px;font-weight:600;color:#313131;">
            ${formatMoney(item.totalPriceCents, currency)}
          </td>
        </tr>`;
    })
    .join('');

  const body = `
    ${renderHeading(t.heading)}
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(t.intro)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.orderNumberLabel)}</p>
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#313131;letter-spacing:0.02em;">${escapeHtml(orderNo)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:12px 0 0;text-align:right;font-size:14px;color:#71717a;">${escapeHtml(t.totalLabel)}</td>
        <td style="padding:12px 0 0 16px;text-align:right;font-size:16px;font-weight:700;color:#313131;">${formatMoney(totalPriceCents, currency)}</td>
      </tr>
    </table>
    ${renderButton(payUrl, t.cta)}
    <p style="margin:0;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.footer)}</p>
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
