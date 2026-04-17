import { Injectable, Logger } from '@nestjs/common';

const DEEPL_LANG_MAP: Record<string, string> = {
  en: 'EN',
  'zh-TW': 'ZH-HANT',
  ja: 'JA',
};

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);

  private get deeplApiKey(): string {
    return process.env.DEEPL_API_KEY || '';
  }

  private get deeplBaseUrl(): string {
    const key = this.deeplApiKey;
    return key.endsWith(':fx')
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';
  }

  /**
   * Generate a URL-safe slug from a product name.
   * If the name contains non-ASCII characters (Chinese/Japanese),
   * translates to English first via DeepL/MyMemory, then slugifies.
   */
  async generateSlug(name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) return '';

    // ASCII-only fast path — no translation needed
    if (/^[\x00-\x7F]+$/.test(trimmed)) {
      return this.slugify(trimmed);
    }

    // Translate to English, then slugify
    try {
      const translations = await this.translateToAll(trimmed, ['en']);
      const english = translations.en?.trim();
      if (english) return this.slugify(english);
    } catch (err) {
      this.logger.warn('Slug generation via translation failed', err);
    }

    // Fallback: strip non-ASCII, keep what's translatable
    return this.slugify(trimmed);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100); // cap length
  }

  /**
   * Translate text from zh-CN to multiple target languages.
   * @param isHtml  When true, preserves HTML tags during translation (for rich text).
   */
  async translateToAll(
    text: string,
    targetLangs: string[] = ['en', 'zh-TW', 'ja'],
    isHtml = false,
  ): Promise<Record<string, string>> {
    if (!text?.trim()) return {};

    if (this.deeplApiKey) {
      return this.translateWithDeepL(text, targetLangs, isHtml);
    }

    return this.translateWithMyMemory(text, targetLangs, isHtml);
  }

  private async translateWithDeepL(
    text: string,
    targetLangs: string[],
    isHtml: boolean,
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(
      targetLangs.map(async (lang) => {
        const targetLang = DEEPL_LANG_MAP[lang];
        if (!targetLang) return;

        try {
          const body: Record<string, unknown> = {
            text: [text],
            source_lang: 'ZH',
            target_lang: targetLang,
          };

          // DeepL natively supports HTML: it translates text content
          // while preserving all HTML tags, attributes, and structure.
          if (isHtml) {
            body.tag_handling = 'html';
          }

          const res = await fetch(`${this.deeplBaseUrl}/v2/translate`, {
            method: 'POST',
            headers: {
              Authorization: `DeepL-Auth-Key ${this.deeplApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            this.logger.warn(`DeepL error for ${lang}: ${res.status}`);
            return;
          }

          const data = (await res.json()) as {
            translations: Array<{ text: string }>;
          };
          if (data.translations?.[0]?.text) {
            results[lang] = data.translations[0].text;
          }
        } catch (err) {
          this.logger.warn(`DeepL translate failed for ${lang}:`, err);
        }
      }),
    );

    return results;
  }

  /**
   * Fallback: MyMemory free API (no key needed, 5000 chars/day).
   * MyMemory doesn't understand HTML tags, so for rich-text input we split
   * the string at tag boundaries, translate only the text chunks, and
   * reassemble — preserving the original tag structure (p, strong, em,
   * ul/ol, li, etc.) exactly as the source.
   */
  private async translateWithMyMemory(
    text: string,
    targetLangs: string[],
    isHtml: boolean,
  ): Promise<Record<string, string>> {
    const langPairMap: Record<string, string> = {
      en: 'zh-CN|en',
      'zh-TW': 'zh-CN|zh-TW',
      ja: 'zh-CN|ja',
    };

    const results: Record<string, string> = {};

    const translateChunk = async (chunk: string, pair: string): Promise<string> => {
      if (!chunk.trim()) return chunk;
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${pair}`,
        );
        const data = (await res.json()) as {
          responseData?: { translatedText?: string };
        };
        return data.responseData?.translatedText ?? chunk;
      } catch (err) {
        this.logger.warn(`MyMemory chunk translate failed:`, err);
        return chunk;
      }
    };

    await Promise.all(
      targetLangs.map(async (lang) => {
        const pair = langPairMap[lang];
        if (!pair) return;

        try {
          if (isHtml) {
            // Split by HTML tags. Even-index items are text, odd-index are tags.
            const parts = text.split(/(<[^>]+>)/);
            const translatedParts = await Promise.all(
              parts.map((part, i) =>
                i % 2 === 1 ? Promise.resolve(part) : translateChunk(part, pair),
              ),
            );
            results[lang] = translatedParts.join('');
          } else {
            const translated = await translateChunk(text, pair);
            if (translated) results[lang] = translated;
          }
        } catch (err) {
          this.logger.warn(`MyMemory translate failed for ${lang}:`, err);
        }
      }),
    );

    return results;
  }
}
