import type { SupportedLocale } from '../locale.util';
import {
  BRAND,
  escapeHtml,
  renderButton,
  renderHeading,
  renderLayout,
} from './shared/layout';

interface Params {
  name: string | null;
  siteUrl: string;
}

interface Strings {
  subject: string;
  heading: string;
  greetingAnon: string;
  greetingWithName: (name: string) => string;
  body: string;
  cta: string;
  signoff: string;
  preheader: string;
}

const CTA_LABEL = 'overrealm.shop';

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: `Welcome to ${BRAND}`,
    heading: `Welcome to ${BRAND}`,
    greetingAnon: 'Hi there,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    body: `The Adventure Begins with You! Thank you for creating an account with ${BRAND}. With your account, you can view your orders, save payment and shipping information, and check out faster.`,
    cta: CTA_LABEL,
    signoff: 'Enjoy the ride,',
    preheader: `Your ${BRAND} account is ready.`,
  },
  ja: {
    subject: `${BRAND}へようこそ`,
    heading: `${BRAND}へようこそ`,
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    body: `冒険はあなたと共に始まります。${BRAND} にご登録いただきありがとうございます。アカウントをお持ちいただくと、ご注文履歴の確認、お支払い情報や配送先の保存、スムーズなお会計が可能です。`,
    cta: CTA_LABEL,
    signoff: 'どうぞお楽しみください、',
    preheader: `${BRAND} アカウントの準備が整いました。`,
  },
  'zh-CN': {
    subject: `欢迎加入 ${BRAND}`,
    heading: `欢迎加入 ${BRAND}`,
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    body: `冒险因您而起！感谢您注册 ${BRAND} 账户。通过账户，您可以查看订单、保存支付与收货信息，并更快完成结账。`,
    cta: CTA_LABEL,
    signoff: '祝您购物愉快，',
    preheader: `您的 ${BRAND} 账户已就绪。`,
  },
  'zh-TW': {
    subject: `歡迎加入 ${BRAND}`,
    heading: `歡迎加入 ${BRAND}`,
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    body: `冒險因您而起！感謝您註冊 ${BRAND} 帳戶。透過帳戶，您可以查看訂單、儲存支付與收貨資訊，並更快完成結帳。`,
    cta: CTA_LABEL,
    signoff: '祝您購物愉快，',
    preheader: `您的 ${BRAND} 帳戶已就緒。`,
  },
};

export function getWelcomeEmail(
  locale: SupportedLocale,
  { name, siteUrl }: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const greeting = name?.trim() ? t.greetingWithName(name.trim()) : t.greetingAnon;

  const body = `
    ${renderHeading(t.heading)}
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${greeting}</p>
    <p style="margin:0 0 4px;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(t.body)}</p>
    ${renderButton(siteUrl, t.cta)}
    <p style="margin:0;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(t.signoff)}<br />${escapeHtml(BRAND)}</p>
  `;

  return {
    subject: t.subject,
    html: renderLayout({
      locale,
      title: t.subject,
      preheader: t.preheader,
      bodyHtml: body,
      siteUrl,
    }),
  };
}
