import type { SupportedLocale } from '../locale.util';
import {
  escapeHtml,
  renderButton,
  renderHeading,
  renderLayout,
} from './shared/layout';

interface Params {
  name: string | null;
  orderNo: string;
  refundAmountCents: number;
  currency: string;
  reason?: string | null;
  isFullRefund: boolean;
  orderUrl: string;
}

interface Strings {
  subject: (orderNo: string) => string;
  preheader: (orderNo: string) => string;
  heading: string;
  greetingAnon: string;
  greetingWithName: (name: string) => string;
  introFull: string;
  introPartial: string;
  orderLabel: string;
  amountLabel: string;
  reasonLabel: string;
  cta: string;
  footer: string;
}

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: (no) => `Refund processed — ${no}`,
    preheader: (no) => `Your refund for order ${no} has been processed.`,
    heading: 'Your refund has been processed',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    introFull:
      'We have processed a full refund for your order. The amount will appear on your original payment method within 5-10 business days, depending on your bank.',
    introPartial:
      'We have processed a partial refund for your order. The amount will appear on your original payment method within 5-10 business days, depending on your bank.',
    orderLabel: 'Order',
    amountLabel: 'Refund Amount',
    reasonLabel: 'Reason',
    cta: 'View Order',
    footer: 'If you have any questions about the refund, please reply to this email.',
  },
  ja: {
    subject: (no) => `返金が完了しました — ${no}`,
    preheader: (no) => `ご注文 ${no} の返金が完了しました。`,
    heading: '返金処理が完了しました',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    introFull:
      'ご注文の全額返金処理を完了いたしました。返金は元のお支払い方法に 5〜10 営業日以内に反映されます（金融機関により異なります）。',
    introPartial:
      'ご注文の一部返金処理を完了いたしました。返金は元のお支払い方法に 5〜10 営業日以内に反映されます（金融機関により異なります）。',
    orderLabel: '注文番号',
    amountLabel: '返金額',
    reasonLabel: '理由',
    cta: '注文を確認する',
    footer: '返金についてご不明な点がございましたら、このメールにご返信ください。',
  },
  'zh-CN': {
    subject: (no) => `退款已完成 — ${no}`,
    preheader: (no) => `订单 ${no} 的退款已处理。`,
    heading: '您的退款已处理',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    introFull:
      '我们已为您完成全额退款。退款将在 5-10 个工作日内退回至您的原支付账户，具体到账时间以银行处理为准。',
    introPartial:
      '我们已为您完成部分退款。退款将在 5-10 个工作日内退回至您的原支付账户，具体到账时间以银行处理为准。',
    orderLabel: '订单编号',
    amountLabel: '退款金额',
    reasonLabel: '退款原因',
    cta: '查看订单',
    footer: '如对退款有任何疑问，请直接回复此邮件。',
  },
  'zh-TW': {
    subject: (no) => `退款已完成 — ${no}`,
    preheader: (no) => `訂單 ${no} 的退款已處理。`,
    heading: '您的退款已處理',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    introFull:
      '我們已為您完成全額退款。退款將在 5-10 個工作日內退回至您的原付款帳戶，具體到帳時間以銀行處理為準。',
    introPartial:
      '我們已為您完成部分退款。退款將在 5-10 個工作日內退回至您的原付款帳戶，具體到帳時間以銀行處理為準。',
    orderLabel: '訂單編號',
    amountLabel: '退款金額',
    reasonLabel: '退款原因',
    cta: '查看訂單',
    footer: '如對退款有任何疑問，請直接回覆此郵件。',
  },
};

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function getOrderRefundCompletedEmail(
  locale: SupportedLocale,
  params: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const { name, orderNo, refundAmountCents, currency, reason, isFullRefund, orderUrl } = params;
  const greeting = name?.trim() ? t.greetingWithName(name.trim()) : t.greetingAnon;
  const intro = isFullRefund ? t.introFull : t.introPartial;

  const reasonBlock = reason?.trim()
    ? `
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.reasonLabel)}</p>
      <p style="margin:0 0 20px;font-size:14px;color:#313131;">${escapeHtml(reason.trim())}</p>
    `
    : '';

  const body = `
    ${renderHeading(t.heading)}
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(intro)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.orderLabel)}</p>
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#313131;">${escapeHtml(orderNo)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.amountLabel)}</p>
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#16a34a;">${formatMoney(refundAmountCents, currency)}</p>
    ${reasonBlock}
    ${renderButton(orderUrl, t.cta)}
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
