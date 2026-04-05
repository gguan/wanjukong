import { wechatLogin, bindPhone } from './api';
import { setUserInfo, clearSession, getUserInfo } from './storage';
import type { CustomerInfo } from './api';

// ─── Silent login singleton ─────────────────────────────

let _silentLoginPromise: Promise<boolean> | null = null;

/**
 * Full WeChat login flow:
 * 1. wx.login() → code
 * 2. Send code to server → get session + customer info
 * 3. Store user info locally
 */
export function login(): Promise<CustomerInfo> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) {
          reject(new Error('微信登录失败'));
          return;
        }
        wechatLogin(res.code)
          .then(({ customer }) => {
            setUserInfo(customer);
            resolve(customer);
          })
          .catch(reject);
      },
      fail() {
        reject(new Error('微信登录失败'));
      },
    });
  });
}

/**
 * Try silent login. Deduplicates concurrent calls — only one wx.login()
 * runs at a time. Returns true if logged in, false otherwise.
 */
export function trySilentLogin(): Promise<boolean> {
  if (isLoggedIn()) return Promise.resolve(true);
  if (_silentLoginPromise) return _silentLoginPromise;

  _silentLoginPromise = login()
    .then(() => true)
    .catch(() => false)
    .finally(() => { _silentLoginPromise = null; });

  return _silentLoginPromise;
}

/**
 * Request phone number binding.
 * Must be triggered from a <button open-type="getPhoneNumber">.
 */
export async function requestPhoneBinding(code: string): Promise<string> {
  const result = await bindPhone(code);
  const info = getUserInfo();
  if (info) {
    info.phone = result.phone;
    setUserInfo(info);
  }
  return result.phone;
}

/**
 * Check if user is logged in (has local user info).
 */
export function isLoggedIn(): boolean {
  return !!getUserInfo();
}

/**
 * Sync auth check — for use in non-async contexts.
 * Redirects to login page if not logged in.
 */
export function requireAuth(): boolean {
  if (!isLoggedIn()) {
    wx.navigateTo({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

/**
 * Async auth check — awaits any in-flight silent login first.
 * Use this in page onLoad() to avoid racing with app launch silent login.
 * Only redirects to login page if silent login also fails.
 */
export async function ensureAuth(): Promise<boolean> {
  // If already logged in, skip
  if (isLoggedIn()) return true;

  // Wait for any in-flight silent login (from app.ts onLaunch)
  if (_silentLoginPromise) {
    await _silentLoginPromise;
    if (isLoggedIn()) return true;
  }

  // Try one more silent login
  const ok = await trySilentLogin();
  if (ok) return true;

  // All failed — redirect to login page for manual login / phone binding
  wx.navigateTo({ url: '/pages/login/index' });
  return false;
}

/**
 * Log out: clear local data and redirect to home.
 */
export function doLogout(): void {
  clearSession();
  wx.reLaunch({ url: '/pages/index/index' });
}
