/**
 * Supported email locales.
 *
 * We keep this set deliberately narrow — translation drift across too many
 * locales is expensive. Add a new one only when there's a real audience.
 */
export type SupportedLocale = 'en' | 'ja' | 'zh-CN' | 'zh-TW';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
] as const;

/**
 * Normalize a raw locale tag from the client (or Accept-Language header) to
 * one of our supported codes. Anything unrecognized falls back to English.
 *
 * Handled inputs include the common browser variants:
 *   - 'ja', 'ja-JP'                                   → 'ja'
 *   - 'zh', 'zh-CN', 'zh-Hans', 'zh-Hans-CN', 'zh-SG' → 'zh-CN'
 *   - 'zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', …         → 'zh-TW'
 *   - everything else                                 → 'en'
 */
export function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return 'en';
  const s = raw.trim().toLowerCase();
  if (!s) return 'en';

  if (s === 'ja' || s.startsWith('ja-') || s.startsWith('ja_')) return 'ja';

  if (s.startsWith('zh')) {
    if (
      s === 'zh-tw' ||
      s === 'zh-hk' ||
      s === 'zh-mo' ||
      s.startsWith('zh-tw') ||
      s.startsWith('zh-hk') ||
      s.startsWith('zh-mo') ||
      s.startsWith('zh-hant') ||
      s.includes('-hant')
    ) {
      return 'zh-TW';
    }
    // zh, zh-CN, zh-SG, zh-Hans, zh-Hans-CN, etc.
    return 'zh-CN';
  }

  return 'en';
}

/** Map our locale code to the HTML `lang` attribute. */
export function htmlLangAttr(locale: SupportedLocale): string {
  return locale === 'zh-CN' ? 'zh-CN' : locale === 'zh-TW' ? 'zh-TW' : locale;
}
