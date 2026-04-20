export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: ['@nuxtjs/i18n'],

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
      { code: 'zh-CN', language: 'zh-Hans-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'zh-TW', language: 'zh-Hant-TW', name: '繁體中文', file: 'zh-TW.json' },
    ],
    defaultDirection: 'ltr',
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en',
    },
    vueI18n: './i18n.config.ts',
  },

  app: {
    head: {
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    // Server-only: lets SSR talk to the API on the internal docker network
    // (e.g. http://api:3001) instead of bouncing back through Nginx via the
    // public hostname. Falls back to the public base if unset.
    apiBaseInternal: process.env.NUXT_API_BASE_INTERNAL || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
      paypalClientId: process.env.NUXT_PUBLIC_PAYPAL_CLIENT_ID || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  compatibilityDate: '2025-01-01',
});
