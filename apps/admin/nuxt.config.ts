export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    },
  },

  compatibilityDate: '2025-01-01',
});
