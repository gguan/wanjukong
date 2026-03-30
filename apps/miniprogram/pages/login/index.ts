import { login, requestPhoneBinding, isLoggedIn } from '../../utils/auth';
import { getUserInfo } from '../../utils/storage';

Page({
  data: {
    loggedIn: false,
    phoneBound: false,
    loading: false,
  },

  onLoad() {
    if (isLoggedIn()) {
      this.checkState();
    }
  },

  checkState() {
    const user = getUserInfo();
    this.setData({
      loggedIn: !!user,
      phoneBound: !!user?.phone,
    });
  },

  async onWechatLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await login();
      this.checkState();
      wx.showToast({ title: '登录成功', icon: 'success' });

      // Navigate back after a short delay
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      }, 1500);
    } catch (err) {
      console.error('Login failed:', err);
      wx.showToast({ title: (err as Error).message || '登录失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onGetPhoneNumber(e: WechatMiniprogram.CustomEvent) {
    if (e.detail.errMsg && !e.detail.errMsg.includes('ok')) {
      // User denied phone permission
      return;
    }

    const code = e.detail.code;
    if (!code) {
      wx.showToast({ title: '获取手机号失败', icon: 'error' });
      return;
    }

    this.setData({ loading: true });
    try {
      await requestPhoneBinding(code);
      this.checkState();
      wx.showToast({ title: '手机号绑定成功', icon: 'success' });

      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      }, 1500);
    } catch (err) {
      console.error('Phone binding failed:', err);
      wx.showToast({ title: (err as Error).message || '绑定失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
