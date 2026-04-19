/**
 * Language helpers for the storefront.
 *
 * Delegates to @nuxtjs/i18n — the module owns detection (URL prefix, cookie,
 * Accept-Language), cookie persistence, and URL-aware switching. This
 * composable preserves the existing consumer API (`lang`, `setLang`,
 * `supported`, `labels`) so call sites that pass `lang.value` as a `?lang=`
 * query param keep working.
 */

export const SUPPORTED_LANGS = ['en', 'zh-CN', 'zh-TW', 'ja'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
};

export function useLang(): {
  lang: Ref<Lang>;
  setLang: (l: Lang) => void;
  supported: typeof SUPPORTED_LANGS;
  labels: typeof LANG_LABELS;
} {
  const { locale } = useI18n();
  const switchLocalePath = useSwitchLocalePath();
  const router = useRouter();

  const lang = computed<Lang>(() => {
    const v = locale.value as string;
    return (SUPPORTED_LANGS as readonly string[]).includes(v) ? (v as Lang) : 'en';
  });

  function setLang(l: Lang) {
    const path = switchLocalePath(l);
    if (path) router.push(path);
  }

  return { lang, setLang, supported: SUPPORTED_LANGS, labels: LANG_LABELS };
}
