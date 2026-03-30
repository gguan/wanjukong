/**
 * Environment detection:
 * - WeChat DevTools → envVersion = 'develop'
 * - Preview / QR scan → envVersion = 'trial'
 * - Released → envVersion = 'release'
 */
const accountInfo = wx.getAccountInfoSync();
const envVersion = accountInfo?.miniProgram?.envVersion || 'release';

const API_URLS: Record<string, string> = {
  develop: 'http://localhost:3001',
  trial: 'https://api.wanjukong.com',
  release: 'https://api.wanjukong.com',
};

export const API_BASE_URL = API_URLS[envVersion] || API_URLS.release;
