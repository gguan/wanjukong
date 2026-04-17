/**
 * Language detection for the web storefront.
 *
 * Priority:
 * 1. URL query param ?lang=en
 * 2. Cookie 'lang' (persists user's explicit choice)
 * 3. Browser / System language (Accept-Language on SSR, navigator.language on client)
 * 4. Default: 'en'
 */

export const SUPPORTED_LANGS = ['en', 'zh-CN', 'zh-TW', 'ja'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
};

/**
 * Normalize a browser locale string (e.g. "zh-Hans-CN", "zh") to our supported lang.
 */
function normalizeLang(raw: string): Lang | null {
  const lower = raw.toLowerCase().trim();

  // Exact match
  for (const s of SUPPORTED_LANGS) {
    if (s.toLowerCase() === lower) return s;
  }

  // zh-CN matches: zh, zh-hans, zh-hans-cn, zh-cn
  if (lower === 'zh' || lower.startsWith('zh-hans') || lower === 'zh-cn') return 'zh-CN';
  // zh-TW matches: zh-hant, zh-hant-tw, zh-tw, zh-hk
  if (lower.startsWith('zh-hant') || lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-TW';
  // Japanese: ja, ja-JP
  if (lower === 'ja' || lower.startsWith('ja-')) return 'ja';
  // English: en-*
  if (lower === 'en' || lower.startsWith('en-')) return 'en';

  return null;
}

/**
 * Detect language from environment (SSR Accept-Language or client navigator.language).
 * Returns null if nothing matches.
 */
function detectSystemLang(): Lang | null {
  // Client side
  if (import.meta.client && typeof navigator !== 'undefined') {
    const candidates = [
      ...(navigator.languages || []),
      navigator.language,
    ].filter(Boolean);
    for (const c of candidates) {
      const match = normalizeLang(c);
      if (match) return match;
    }
    return null;
  }

  // Server side (SSR) — read Accept-Language header
  if (import.meta.server) {
    try {
      const headers = useRequestHeaders(['accept-language']);
      const al = headers['accept-language'];
      if (!al) return null;
      // Parse "zh-CN,zh;q=0.9,en;q=0.8" → ["zh-CN", "zh", "en"]
      const langs = al
        .split(',')
        .map((p) => p.split(';')[0].trim())
        .filter(Boolean);
      for (const c of langs) {
        const match = normalizeLang(c);
        if (match) return match;
      }
    } catch { /* headers unavailable */ }
  }

  return null;
}

export function useLang(): {
  lang: Ref<Lang>;
  setLang: (l: Lang) => void;
  supported: typeof SUPPORTED_LANGS;
  labels: typeof LANG_LABELS;
} {
  const route = useRoute();
  const langCookie = useCookie<string | null>('lang', { maxAge: 365 * 24 * 60 * 60 });

  const lang = computed<Lang>(() => {
    // 1. URL query param
    const q = (route.query.lang as string)?.trim();
    const qMatch = q ? normalizeLang(q) : null;
    if (qMatch) return qMatch;

    // 2. Cookie (persisted user choice)
    const c = langCookie.value?.trim();
    const cMatch = c ? normalizeLang(c) : null;
    if (cMatch) return cMatch;

    // 3. System language (browser / Accept-Language)
    const sysMatch = detectSystemLang();
    if (sysMatch) return sysMatch;

    // 4. Fallback: English
    return 'en';
  });

  function setLang(l: Lang) {
    langCookie.value = l;
    // Full page reload with new lang query param to re-fetch all localized data
    if (import.meta.client) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', l);
      window.location.href = url.toString();
    }
  }

  return { lang, setLang, supported: SUPPORTED_LANGS, labels: LANG_LABELS };
}
