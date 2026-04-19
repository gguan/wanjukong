import type { SupportedLocale } from '../locale.util';
import { escapeHtml, renderButton, renderLayout } from './shared/layout';

interface Params {
  name: string | null;
  resetUrl: string;
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
    subject: 'Reset your password',
    greetingAnon: 'Hi,',
    greetingWithName: (n) => `Hi ${escapeHtml(n)},`,
    intro:
      'We received a request to reset your password. Click the button below to choose a new one.',
    cta: 'Reset Password',
    fallback:
      "If the button doesn't work, copy and paste this link into your browser:",
    ignore:
      "If you didn't request a password reset, you can safely ignore this email.",
    preheader: 'Use this link to reset your Over Realm password.',
  },
  ja: {
    subject: 'パスワードの再設定',
    greetingAnon: 'こんにちは、',
    greetingWithName: (n) => `${escapeHtml(n)} 様、`,
    intro:
      'パスワード再設定のリクエストを受け付けました。下のボタンから新しいパスワードを設定してください。',
    cta: 'パスワードを再設定する',
    fallback:
      'ボタンが機能しない場合は、以下のリンクをブラウザにコピーしてください：',
    ignore:
      'このメールにお心当たりがない場合は、そのまま破棄していただいて問題ありません。',
    preheader: 'このリンクから Over Realm のパスワードを再設定できます。',
  },
  'zh-CN': {
    subject: '重置您的密码',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '我们收到了重置您密码的请求。请点击下方按钮设置新密码。',
    cta: '重置密码',
    fallback: '如果按钮无法使用，请复制以下链接到浏览器打开：',
    ignore: '如果不是您本人发起的请求，可以忽略此邮件。',
    preheader: '使用此链接重置您的 Over Realm 密码。',
  },
  'zh-TW': {
    subject: '重設您的密碼',
    greetingAnon: '您好，',
    greetingWithName: (n) => `${escapeHtml(n)} 您好，`,
    intro: '我們收到了重設您密碼的要求。請點擊下方按鈕設定新密碼。',
    cta: '重設密碼',
    fallback: '如果按鈕無法使用，請複製以下連結到瀏覽器開啟：',
    ignore: '若非您本人發起的要求，可直接忽略此郵件。',
    preheader: '使用此連結重設您的 Over Realm 密碼。',
  },
};

export function getPasswordResetEmail(
  locale: SupportedLocale,
  { name, resetUrl }: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const greeting = name ? t.greetingWithName(name) : t.greetingAnon;

  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#18181b;">${greeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#18181b;">${escapeHtml(t.intro)}</p>
    ${renderButton(resetUrl, t.cta)}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#71717a;">${escapeHtml(t.fallback)}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#71717a;word-break:break-all;">${resetUrl}</p>
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
 * while we migrate them to `getPasswordResetEmail(locale, …)`.
 */
export function getPasswordResetEmailHtml(
  name: string | null,
  resetUrl: string,
): string {
  return getPasswordResetEmail('en', { name, resetUrl }).html;
}
