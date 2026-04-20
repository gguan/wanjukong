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
  verifyUrl: string;
}

interface Strings {
  subject: string;
  heading: string;
  greetingAnon: string;
  greetingWithName: (name: string) => string;
  intro: string;
  cta: string;
  fallback: string;
  ignore: string;
  preheader: string;
}

const STRINGS: Record<SupportedLocale, Strings> = {
  en: {
    subject: 'Verify your email',
    heading: 'Verify your account',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro:
      'Before you can use all account features, we need to verify your account.',
    cta: 'Verify Your Account',
    fallback:
      "If the button doesn't work, copy and paste this link into your browser:",
    ignore:
      "If you didn't create an account, contact us to deactivate the account.",
    preheader: `Confirm your ${BRAND} email address.`,
  },
  ja: {
    subject: 'メールアドレスの確認',
    heading: 'アカウントを確認する',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro:
      'アカウントのすべての機能をご利用いただくには、まずアカウントの確認が必要です。',
    cta: 'アカウントを確認する',
    fallback:
      'ボタンが機能しない場合は、以下のリンクをブラウザにコピーしてください：',
    ignore:
      'このメールにお心当たりがない場合は、アカウントの無効化をお問い合わせください。',
    preheader: `${BRAND} のメールアドレスをご確認ください。`,
  },
  'zh-CN': {
    subject: '验证您的邮箱',
    heading: '验证您的账户',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '在使用全部账户功能之前，请先验证您的账户。',
    cta: '验证您的账户',
    fallback: '如果按钮无法使用，请复制以下链接到浏览器打开：',
    ignore: '如果您并未注册账户，请联系我们停用该账户。',
    preheader: `请确认您的 ${BRAND} 邮箱地址。`,
  },
  'zh-TW': {
    subject: '驗證您的電子郵件',
    heading: '驗證您的帳戶',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '使用完整帳戶功能前，請先驗證您的帳戶。',
    cta: '驗證您的帳戶',
    fallback: '如果按鈕無法使用，請複製以下連結到瀏覽器開啟：',
    ignore: '若您並未註冊帳戶，請聯絡我們停用該帳戶。',
    preheader: `請確認您的 ${BRAND} 電子郵件地址。`,
  },
};

export function getVerificationEmail(
  locale: SupportedLocale,
  { name, verifyUrl }: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const greeting = name ? t.greetingWithName(name) : t.greetingAnon;

  const body = `
    ${renderHeading(t.heading)}
    <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:#313131;">${greeting}</p>
    <p style="margin:0 0 4px;font-size:16px;line-height:1.618;color:#313131;">${escapeHtml(t.intro)}</p>
    ${renderButton(verifyUrl, t.cta)}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.fallback)}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#71717a;word-break:break-all;">${verifyUrl}</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.ignore)}</p>
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

/**
 * @deprecated Kept so call sites that still pass no locale keep compiling
 * while we migrate them to `getVerificationEmail(locale, …)`.
 */
export function getVerificationEmailHtml(
  name: string | null,
  verifyUrl: string,
): string {
  return getVerificationEmail('en', { name, verifyUrl }).html;
}
