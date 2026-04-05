import { login, requestPhoneBinding, isLoggedIn } from '../../utils/auth';
import { getUserInfo } from '../../utils/storage';

Page({
  data: {
    statusBarHeight: 44,
    loggedIn: false,
    phoneBound: false,
    loading: false,
  },

  onLoad() {
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight: statusBarHeight || 44 });

    if (isLoggedIn()) {
      this.checkState();
      // If already fully logged in, redirect immediately
      const user = getUserInfo();
      if (user?.phone) {
        this.goBack();
      }
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

      const user = getUserInfo();
      if (user?.phone) {
        // Already has phone — fully logged in, go back
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => this.goBack(), 1000);
      } else {
        // Logged in but no phone — stay on page to show phone binding
        wx.showToast({ title: '登录成功', icon: 'success' });
      }
    } catch (err) {
      console.error('Login failed:', err);
      wx.showToast({ title: (err as Error).message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onGetPhoneNumber(e: WechatMiniprogram.CustomEvent) {
    if (e.detail.errMsg && !e.detail.errMsg.includes('ok')) {
      return;
    }

    const code = e.detail.code;
    if (!code) {
      wx.showToast({ title: '获取手机号失败', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      await requestPhoneBinding(code);
      this.checkState();
      wx.showToast({ title: '绑定成功', icon: 'success' });
      setTimeout(() => this.goBack(), 1000);
    } catch (err) {
      console.error('Phone binding failed:', err);
      wx.showToast({ title: (err as Error).message || '绑定失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSkipPhone() {
    this.goBack();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onGoBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },
});
