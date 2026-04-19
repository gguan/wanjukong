import type { Lang } from './useLang'

export type LocaleStrings = Record<string, string>
export type Translations = Partial<Record<Lang, LocaleStrings>>

/**
 * Lightweight page-scoped i18n. Callers pass a per-locale string dictionary
 * and get a reactive `t(key, params?)` that resolves against the current
 * `useLang()` value.
 *
 * Missing keys fall back to `en`, then to the key itself. `{var}` placeholders
 * are replaced by `params[var]`; values are inserted as-is, so callers must
 * escape any HTML before interpolating into a v-html binding.
 */
export function useTranslations(dict: Translations): {
  t: (key: string, params?: Record<string, string | number>) => string
} {
  const { lang } = useLang()

  function t(key: string, params?: Record<string, string | number>): string {
    let s = dict[lang.value]?.[key] ?? dict.en?.[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return s
  }

  return { t }
}

/**
 * HTML-escape user input before interpolating into a v-html template.
 * Static translation strings are trusted; dynamic values (like user email)
 * must go through this.
 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return c
    }
  })
}
