import { isLoggedIn, doLogout } from '../../utils/auth';
import { getUserInfo } from '../../utils/storage';
import type { UserInfo } from '../../utils/storage';

Page({
  data: {
    loggedIn: false,
    user: null as UserInfo | null,
    statusBarHeight: 0,
    points: 0,
    coupons: 0,
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 });
  },

  onShow() {
    this.refreshState();
  },

  refreshState() {
    const loggedIn = isLoggedIn();
    const user = loggedIn ? getUserInfo() : null;
    this.setData({ loggedIn, user });
  },

  onTapLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  // Quick action handlers
  onTapPendingPayment() {
    if (!isLoggedIn()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/orders/index?tab=pending' });
  },

  onTapPendingShip() {
    if (!isLoggedIn()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/orders/index?tab=confirmed' });
  },

  onTapPendingReceive() {
    if (!isLoggedIn()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/orders/index?tab=shipped' });
  },

  onTapAllOrders() {
    if (!isLoggedIn()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/orders/index' });
  },

  // Menu handlers
  onTapAddress() {
    if (!isLoggedIn()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.showToast({ title: '地址管理开发中', icon: 'none' });
  },

  onTapService() {
    wx.showToast({ title: '客服功能开发中', icon: 'none' });
  },

  onTapFollow() {
    wx.showToast({ title: '关注我们', icon: 'none' });
  },

  onTapBrandIntro() {
    wx.showModal({
      title: '品牌介绍',
      content: '万局控 — 精选全球顶级手办，为收藏家而生。',
      showCancel: false,
    });
  },

  onTapAgreement() {
    wx.showToast({ title: '协议规则', icon: 'none' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          doLogout();
        }
      },
    });
  },
});
