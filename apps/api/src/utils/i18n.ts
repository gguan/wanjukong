/**
 * Supported languages.
 * zh-CN is the default (stored in the original field, not in i18n JSON).
 */
export const SUPPORTED_LANGS = ['zh-CN', 'en', 'zh-TW', 'ja'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = 'zh-CN';

/**
 * Resolve an i18n field: returns the translation for the requested language,
 * falling back to the original (zh-CN) value.
 *
 * @param original  The default zh-CN value (stored in the main field)
 * @param i18nJson  The i18n JSON object (e.g. {"en":"Spider-Man","ja":"スパイダーマン"})
 * @param lang      Requested language
 */
export function resolveI18n(
  original: string | null | undefined,
  i18nJson: Record<string, string> | null | undefined,
  lang: Lang,
): string | null {
  if (!lang || lang === DEFAULT_LANG) {
    return original ?? null;
  }
  const translated = i18nJson?.[lang];
  if (translated && translated.trim()) {
    return translated;
  }
  // Fallback to original
  return original ?? null;
}

/**
 * Apply i18n resolution to a plain object.
 * For each field that has a corresponding `{field}I18n` key,
 * replaces the field value with the resolved translation.
 *
 * Example:
 *   localizeObject({ name: '蜘蛛侠', nameI18n: {en:'Spider-Man'} }, 'en')
 *   → { name: 'Spider-Man', nameI18n: {en:'Spider-Man'} }
 */
export function localizeObject<T extends Record<string, unknown>>(
  obj: T,
  lang: Lang,
): T {
  if (!lang || lang === DEFAULT_LANG) return obj;

  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const i18nKey = `${key}I18n`;
    if (i18nKey in result) {
      const original = result[key] as string | null;
      const i18nJson = result[i18nKey] as Record<string, string> | null;
      (result as Record<string, unknown>)[key] = resolveI18n(original, i18nJson, lang);
    }
  }
  return result;
}

/**
 * Localize a product and its nested relations (brand, category, variants).
 */
export function localizeProduct<T extends Record<string, unknown>>(
  product: T,
  lang: Lang,
): T {
  if (!lang || lang === DEFAULT_LANG) return product;

  const result = localizeObject(product, lang);

  // Localize nested brand
  if (result.brand && typeof result.brand === 'object') {
    (result as Record<string, unknown>).brand = localizeObject(
      result.brand as Record<string, unknown>,
      lang,
    );
  }

  // Localize nested category
  if (result.category && typeof result.category === 'object') {
    (result as Record<string, unknown>).category = localizeObject(
      result.category as Record<string, unknown>,
      lang,
    );
  }

  // Localize nested variants
  if (Array.isArray(result.variants)) {
    (result as Record<string, unknown>).variants = (
      result.variants as Record<string, unknown>[]
    ).map((v) => localizeObject(v, lang));
  }

  return result;
}
