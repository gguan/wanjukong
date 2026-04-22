// Single source of truth for the public site URL. Production always
// resolves to the real domain so SSR never leaks `localhost:3000` into
// hreflang / canonical / og:url — that leak was flagging the site as
// a suspicious / potentially-phishing domain to Google Safe Browsing.
// Local dev keeps localhost so nuxi dev still works; preview / staging
// deploys can override via NUXT_PUBLIC_SITE_URL.
const SITE_URL =
  process.env.NUXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://overrealm.shop'
    : 'http://localhost:3000');

// Fail the production build if somebody explicitly set localhost — it
// would ship the same Safe Browsing-flagged SSR output.
if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(SITE_URL)) {
  throw new Error(
    `[nuxt.config] NUXT_PUBLIC_SITE_URL must be a public URL in production (got: ${SITE_URL})`,
  );
}

export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: ['@nuxtjs/i18n'],

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    baseUrl: SITE_URL,
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
      { code: 'zh-CN', language: 'zh-Hans-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'zh-TW', language: 'zh-Hant-TW', name: '繁體中文', file: 'zh-TW.json' },
    ],
    defaultDirection: 'ltr',
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
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
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
      siteUrl: SITE_URL,
    },
  },

  compatibilityDate: '2025-01-01',
});
