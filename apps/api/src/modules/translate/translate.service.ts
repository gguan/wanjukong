import { Injectable, Logger } from '@nestjs/common';

interface TranslateResult {
  text: string;
  lang: string;
}

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
    // Free API uses api-free.deepl.com, Pro uses api.deepl.com
    const key = this.deeplApiKey;
    if (key.endsWith(':fx')) {
      return 'https://api-free.deepl.com';
    }
    return 'https://api.deepl.com';
  }

  /**
   * Translate text from zh-CN to multiple target languages.
   * Returns { en: "...", "zh-TW": "...", ja: "..." }
   */
  async translateToAll(
    text: string,
    targetLangs: string[] = ['en', 'zh-TW', 'ja'],
  ): Promise<Record<string, string>> {
    if (!text?.trim()) return {};

    if (this.deeplApiKey) {
      return this.translateWithDeepL(text, targetLangs);
    }

    // Fallback: MyMemory (free, no API key, lower quality)
    return this.translateWithMyMemory(text, targetLangs);
  }

  private async translateWithDeepL(
    text: string,
    targetLangs: string[],
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(
      targetLangs.map(async (lang) => {
        const targetLang = DEEPL_LANG_MAP[lang];
        if (!targetLang) return;

        try {
          const res = await fetch(`${this.deeplBaseUrl}/v2/translate`, {
            method: 'POST',
            headers: {
              Authorization: `DeepL-Auth-Key ${this.deeplApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: [text],
              source_lang: 'ZH',
              target_lang: targetLang,
            }),
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
   * Fallback: MyMemory free API (no key needed, 5000 chars/day)
   */
  private async translateWithMyMemory(
    text: string,
    targetLangs: string[],
  ): Promise<Record<string, string>> {
    const langPairMap: Record<string, string> = {
      en: 'zh-CN|en',
      'zh-TW': 'zh-CN|zh-TW',
      ja: 'zh-CN|ja',
    };

    const results: Record<string, string> = {};

    await Promise.all(
      targetLangs.map(async (lang) => {
        const pair = langPairMap[lang];
        if (!pair) return;

        try {
          const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`,
          );
          const data = (await res.json()) as {
            responseData?: { translatedText?: string };
          };
          if (data.responseData?.translatedText) {
            results[lang] = data.responseData.translatedText;
          }
        } catch (err) {
          this.logger.warn(`MyMemory translate failed for ${lang}:`, err);
        }
      }),
    );

    return results;
  }
}
