import { login, isLoggedIn } from './utils/auth';

App({
  globalData: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
  },

  onLaunch() {
    // Silent login — skip in DevTools if API not reachable
    if (!isLoggedIn()) {
      login().catch(() => {
        // Expected to fail in DevTools without backend — silently ignore
      });
    }
  },
});
