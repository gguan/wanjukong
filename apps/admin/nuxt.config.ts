// Nuxt may not auto-load .env from monorepo subdirectory — load explicitly
import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([^#=][^=]*)=(.*)/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
} catch {
  // .env not found — use defaults
}

export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@element-plus/nuxt'],

  css: [
    '~/assets/element-theme.css',
    '~/assets/admin-theme.css',
  ],

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
