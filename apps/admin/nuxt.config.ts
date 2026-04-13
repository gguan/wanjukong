import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load apps/admin/.env explicitly (Nuxt only auto-loads root .env)
try {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env not found — use defaults */ }

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
      captchaAppId: '',
    },
  },

  compatibilityDate: '2025-01-01',
});
