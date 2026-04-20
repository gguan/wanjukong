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
  status: string;
  orderUrl: string;
}

interface Strings {
  subject: (orderNo: string) => string;
  preheader: (orderNo: string) => string;
  heading: string;
  greetingAnon: string;
  greetingWithName: (name: string) => string;
  intro: string;
  orderLabel: string;
  statusLabel: string;
  cta: string;
  statuses: Record<string, string>;
}

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: (no) => `Order update — ${no}`,
    preheader: (no) => `Status update for order ${no}.`,
    heading: 'Order update',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro: 'Your order status has been updated.',
    orderLabel: 'Order',
    statusLabel: 'New Status',
    cta: 'View Order',
    statuses: {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      CANCELLED: 'Cancelled',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
    },
  },
  ja: {
    subject: (no) => `ご注文状況の更新 — ${no}`,
    preheader: (no) => `ご注文 ${no} のステータスが更新されました。`,
    heading: 'ご注文状況の更新',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro: 'ご注文のステータスが更新されました。',
    orderLabel: '注文番号',
    statusLabel: '新しいステータス',
    cta: '注文を確認する',
    statuses: {
      PENDING: '保留中',
      CONFIRMED: '確定',
      CANCELLED: 'キャンセル',
      SHIPPED: '発送済み',
      DELIVERED: '配達済み',
    },
  },
  'zh-CN': {
    subject: (no) => `订单状态更新 — ${no}`,
    preheader: (no) => `您的订单 ${no} 状态已更新。`,
    heading: '订单状态更新',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '您的订单状态已更新。',
    orderLabel: '订单编号',
    statusLabel: '新状态',
    cta: '查看订单',
    statuses: {
      PENDING: '待处理',
      CONFIRMED: '已确认',
      CANCELLED: '已取消',
      SHIPPED: '已发货',
      DELIVERED: '已送达',
    },
  },
  'zh-TW': {
    subject: (no) => `訂單狀態更新 — ${no}`,
    preheader: (no) => `您的訂單 ${no} 狀態已更新。`,
    heading: '訂單狀態更新',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '您的訂單狀態已更新。',
    orderLabel: '訂單編號',
    statusLabel: '新狀態',
    cta: '查看訂單',
    statuses: {
      PENDING: '待處理',
      CONFIRMED: '已確認',
      CANCELLED: '已取消',
      SHIPPED: '已發貨',
      DELIVERED: '已送達',
    },
  },
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#16a34a',
  CANCELLED: '#dc2626',
  PENDING: '#d97706',
  SHIPPED: '#2563eb',
  DELIVERED: '#16a34a',
};

export function getOrderStatusUpdateEmail(
  locale: SupportedLocale,
  params: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const { name, orderNo, status, orderUrl } = params;
  const greeting = name?.trim() ? t.greetingWithName(name.trim()) : t.greetingAnon;
  const statusLabel = t.statuses[status] ?? status;
  const color = STATUS_COLORS[status] ?? '#18181b';

  const body = `
    ${renderHeading(t.heading)}
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(t.intro)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.orderLabel)}</p>
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#313131;">${escapeHtml(orderNo)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(t.statusLabel)}</p>
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:${color};">${escapeHtml(statusLabel)}</p>
    ${renderButton(orderUrl, t.cta)}
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
