import { login, isLoggedIn } from './utils/auth';

App({
  globalData: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
  },

  onLaunch() {
    // Silent login on launch if not already logged in
    if (!isLoggedIn()) {
      login().catch((err) => {
        console.warn('Auto login failed:', err.message);
      });
    }
  },
});
