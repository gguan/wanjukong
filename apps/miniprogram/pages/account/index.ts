import { isLoggedIn, doLogout } from '../../utils/auth';
import { getUserInfo } from '../../utils/storage';
import type { UserInfo } from '../../utils/storage';

Page({
  data: {
    loggedIn: false,
    user: null as UserInfo | null,
    menuItems: [
      { label: '我的订单', icon: 'order', url: '/pages/orders/index' },
    ],
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

  onTapMenu(e: WechatMiniprogram.TouchEvent) {
    const url = e.currentTarget.dataset.url as string;
    if (!isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.navigateTo({ url });
  },

  onTapOrders() {
    if (!isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/orders/index' });
  },

  onTapAbout() {
    wx.showModal({
      title: '关于万局控',
      content: '万局控 — 精选手办，全球收藏。\n如有问题请联系客服。',
      showCancel: false,
    });
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
