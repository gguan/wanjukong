import { wechatLogin, bindPhone } from './api';
import { setUserInfo, clearSession, getUserInfo } from './storage';
import type { CustomerInfo } from './api';

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
 * Ensure user is logged in. If not, redirect to login page.
 */
export function requireAuth(): boolean {
  if (!isLoggedIn()) {
    wx.navigateTo({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

/**
 * Log out: clear local data and redirect to home.
 */
export function doLogout(): void {
  clearSession();
  wx.reLaunch({ url: '/pages/index/index' });
}
