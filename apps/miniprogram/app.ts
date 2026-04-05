import { trySilentLogin } from './utils/auth';

App({
  globalData: {},

  onLaunch() {
    // Silent login on app start — pages use ensureAuth() to await this
    trySilentLogin();
  },
});
