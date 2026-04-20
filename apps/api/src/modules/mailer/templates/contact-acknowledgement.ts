import type { SupportedLocale } from '../locale.util';
import { BRAND, escapeHtml, renderHeading, renderLayout } from './shared/layout';

export interface ContactAckParams {
  name: string;
  subject: string;
  message: string;
}

interface Strings {
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  body: string;
  hours: string;
  yourSubject: string;
  yourMessage: string;
  signoff: string;
  preheader: string;
}

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: `We've received your message — ${BRAND}`,
    heading: "We've received your message",
    greeting: (n) => `Hi ${escapeHtml(n)},`,
    body: `Thanks for getting in touch with ${BRAND}. We've received your message and will reply during business hours.`,
    hours: 'Mon–Fri, 10:00–18:00 (China Time).',
    yourSubject: 'Your subject',
    yourMessage: 'Your message',
    signoff: `— ${BRAND} Customer Service`,
    preheader: "We've received your message and will get back to you soon.",
  },
  ja: {
    subject: `お問い合わせを受け付けました — ${BRAND}`,
    heading: 'お問い合わせを受け付けました',
    greeting: (n) => `${escapeHtml(n)} 様、`,
    body: `${BRAND} にお問い合わせいただきありがとうございます。メッセージを受け付けました。営業時間内にご返信いたします。`,
    hours: '営業時間：月〜金 10:00〜18:00（中国時間）',
    yourSubject: 'ご用件',
    yourMessage: 'お問い合わせ内容',
    signoff: `— ${BRAND} カスタマーサービス`,
    preheader: 'お問い合わせを受け付けました。近日中にご返信いたします。',
  },
  'zh-CN': {
    subject: `我们已收到您的留言 — ${BRAND}`,
    heading: '我们已收到您的留言',
    greeting: (n) => `${escapeHtml(n)} 您好，`,
    body: `感谢您联系 ${BRAND}。我们已收到您的留言，将在营业时间内回复您。`,
    hours: '营业时间：周一至周五 10:00–18:00（中国时间）',
    yourSubject: '您的主题',
    yourMessage: '您的留言',
    signoff: `— ${BRAND} 客户服务`,
    preheader: '我们已收到您的留言，将尽快回复。',
  },
  'zh-TW': {
    subject: `我們已收到您的訊息 — ${BRAND}`,
    heading: '我們已收到您的訊息',
    greeting: (n) => `${escapeHtml(n)} 您好，`,
    body: `感謝您聯絡 ${BRAND}。我們已收到您的訊息，將於營業時間內回覆您。`,
    hours: '營業時間：週一至週五 10:00–18:00（中國時間）',
    yourSubject: '您的主旨',
    yourMessage: '您的訊息',
    signoff: `— ${BRAND} 客戶服務`,
    preheader: '我們已收到您的訊息，將盡快回覆。',
  },
};

function renderQuote(label: string, value: string): string {
  return `
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;">${escapeHtml(label)}</p>
    <div style="margin:0 0 16px;padding:12px 14px;border-left:3px solid #ebebeb;font-size:14px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${escapeHtml(value)}</div>
  `;
}

export function getContactAcknowledgementEmail(
  locale: SupportedLocale,
  params: ContactAckParams,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;

  const body = `
    ${renderHeading(t.heading)}
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${t.greeting(params.name)}</p>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(t.body)}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.hours)}</p>
    ${renderQuote(t.yourSubject, params.subject)}
    ${renderQuote(t.yourMessage, params.message)}
    <p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.signoff)}</p>
  `;

  return {
    subject: t.subject,
    html: renderLayout({
      locale,
      title: t.subject,
      preheader: t.preheader,
      bodyHtml: body,
    }),
  };
}
