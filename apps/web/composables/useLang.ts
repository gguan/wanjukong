/**
 * Language detection for the web storefront.
 *
 * Priority:
 * 1. URL query param ?lang=en
 * 2. Cookie 'lang'
 * 3. Browser Accept-Language
 * 4. Default: 'en' (international storefront)
 */

const SUPPORTED = ['zh-CN', 'en', 'zh-TW', 'ja'] as const;
type Lang = (typeof SUPPORTED)[number];

export function useLang(): { lang: Ref<Lang>; setLang: (l: Lang) => void } {
  const route = useRoute();
  const langCookie = useCookie('lang', { maxAge: 365 * 24 * 60 * 60 });

  const lang = computed<Lang>(() => {
    // 1. URL query
    const q = (route.query.lang as string)?.trim();
    if (q && SUPPORTED.includes(q as Lang)) return q as Lang;

    // 2. Cookie
    const c = langCookie.value?.trim();
    if (c && SUPPORTED.includes(c as Lang)) return c as Lang;

    // 3. Default for international storefront
    return 'en';
  });

  function setLang(l: Lang) {
    langCookie.value = l;
    // Reload to re-fetch data in new language
    navigateTo({ query: { ...route.query, lang: l } });
  }

  return { lang, setLang };
}
