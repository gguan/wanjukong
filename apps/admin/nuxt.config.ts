export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@element-plus/nuxt'],

  css: ['~/assets/admin-theme.css'],

  elementPlus: {
    importStyle: 'css',
    icon: 'ElIcon',
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    },
  },

  compatibilityDate: '2025-01-01',
});
