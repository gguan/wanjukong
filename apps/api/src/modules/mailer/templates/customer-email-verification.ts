import type { SupportedLocale } from '../locale.util';
import { escapeHtml, renderButton, renderLayout } from './shared/layout';

interface Params {
  name: string | null;
  verifyUrl: string;
}

interface Strings {
  subject: string;
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
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro:
      'Thanks for signing up! Please verify your email address by clicking the button below.',
    cta: 'Verify Email',
    fallback:
      "If the button doesn't work, copy and paste this link into your browser:",
    ignore:
      "If you didn't create an account, you can safely ignore this email.",
    preheader: 'Confirm your Over Realm email address.',
  },
  ja: {
    subject: 'メールアドレスの確認',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro:
      'ご登録ありがとうございます。下のボタンからメールアドレスをご確認ください。',
    cta: 'メールアドレスを確認する',
    fallback:
      'ボタンが機能しない場合は、以下のリンクをブラウザにコピーしてください：',
    ignore:
      'このメールにお心当たりがない場合は、そのまま破棄していただいて問題ありません。',
    preheader: 'Over Realm のメールアドレスをご確認ください。',
  },
  'zh-CN': {
    subject: '验证您的邮箱',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '感谢您的注册！请点击下方按钮验证您的邮箱地址。',
    cta: '验证邮箱',
    fallback: '如果按钮无法使用，请复制以下链接到浏览器打开：',
    ignore: '如果您并未注册账户，可以忽略此邮件。',
    preheader: '请确认您的 Over Realm 邮箱地址。',
  },
  'zh-TW': {
    subject: '驗證您的電子郵件',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '感謝您的註冊！請點擊下方按鈕驗證您的電子郵件地址。',
    cta: '驗證電子郵件',
    fallback: '如果按鈕無法使用，請複製以下連結到瀏覽器開啟：',
    ignore: '若您並未註冊帳戶，可直接忽略此郵件。',
    preheader: '請確認您的 Over Realm 電子郵件地址。',
  },
};

export function getVerificationEmail(
  locale: SupportedLocale,
  { name, verifyUrl }: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const greeting = name ? t.greetingWithName(name) : t.greetingAnon;

  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#18181b;">${greeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#18181b;">${escapeHtml(t.intro)}</p>
    ${renderButton(verifyUrl, t.cta)}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.fallback)}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#71717a;word-break:break-all;">${verifyUrl}</p>
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
