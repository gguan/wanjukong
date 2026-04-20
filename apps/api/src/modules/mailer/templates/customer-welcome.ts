import type { SupportedLocale } from '../locale.util';
import { escapeHtml } from './shared/layout';
import { htmlLangAttr } from '../locale.util';

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
  brand: string;
  preheader: string;
}

const BRAND = 'Over Realm';
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
    brand: BRAND,
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
    brand: BRAND,
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
    brand: BRAND,
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
    brand: BRAND,
    preheader: `您的 ${BRAND} 帳戶已就緒。`,
  },
};

/**
 * Card-on-gray layout with a top-left brand logo, outline CTA button, and
 * signoff divider — modeled after the Squarespace transactional template
 * the user referenced. Scoped to the welcome email so other transactional
 * templates can keep the plainer shared layout until we revisit them.
 */
export function getWelcomeEmail(
  locale: SupportedLocale,
  { name, siteUrl }: Params,
): { subject: string; html: string } {
  const t = STRINGS[locale] ?? STRINGS.en;
  const greeting = name?.trim() ? t.greetingWithName(name.trim()) : t.greetingAnon;
  const logoUrl = `${siteUrl.replace(/\/$/, '')}/logo.png`;

  const fontStack =
    `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif`;
  const textColor = '#313131';
  const borderColor = '#313131';
  const dividerColor = '#ebebeb';
  const outerBg = '#ebebeb';

  const html = `<!DOCTYPE html>
<html lang="${htmlLangAttr(locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(t.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${outerBg};font-family:${fontStack};">
  <div style="display:none;font-size:1px;color:${outerBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(t.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${outerBg};border-top:44px solid ${outerBg};border-bottom:44px solid ${outerBg};table-layout:fixed;">
    <tr>
      <td align="center" valign="top" style="font-size:1em;">
        <table role="presentation" width="594" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff;max-width:594px;width:100%;">
          <!-- Header: logo top-left -->
          <tr>
            <td align="left" valign="middle" style="padding:55px 44px 33px;">
              <a href="${siteUrl}" target="_blank" rel="noopener" style="text-decoration:none;border:0;display:inline-block;">
                <img src="${logoUrl}" alt="${escapeHtml(t.brand)}" height="48" style="display:block;border:0;height:auto;max-height:48px;max-width:100%;width:auto;" />
              </a>
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="padding:11px 44px;color:${textColor};">
              <h1 style="margin:0;font-weight:400;font-size:24px;line-height:1.25;color:${textColor};font-family:${fontStack};">${escapeHtml(t.heading)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:11px 44px;color:${textColor};">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.618;color:${textColor};font-family:${fontStack};">${greeting}</p>
              <p style="margin:0;font-size:16px;line-height:1.618;color:${textColor};font-family:${fontStack};">${escapeHtml(t.body)}</p>
            </td>
          </tr>
          <!-- Outline CTA button -->
          <tr>
            <td align="left" style="padding:22px 44px;">
              <a href="${siteUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:16px 36px;background-color:transparent;border:1px solid ${borderColor};color:${textColor};font-family:${fontStack};font-size:11px;font-weight:600;line-height:1;letter-spacing:0.2em;text-decoration:none;text-transform:uppercase;">${escapeHtml(t.cta)}</a>
            </td>
          </tr>
          <!-- Signoff -->
          <tr>
            <td style="padding:11px 44px;color:${textColor};">
              <p style="margin:0;font-size:16px;line-height:1.618;color:${textColor};font-family:${fontStack};">${escapeHtml(t.signoff)}<br />${escapeHtml(t.brand)}</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td align="center" style="padding:22px 44px;">
              <div style="width:100%;height:0;border-top:1px solid ${dividerColor};font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <!-- Bottom spacer (keeps the divider from hugging the card edge) -->
          <tr>
            <td style="padding:0 44px 33px;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject: t.subject, html };
}
