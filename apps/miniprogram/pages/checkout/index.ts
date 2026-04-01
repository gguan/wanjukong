import { createWechatOrder, validateCoupon } from '../../utils/api';
import { requestPayment } from '../../utils/payment';
import { requireAuth } from '../../utils/auth';
import { getCart, clearCart, getUserInfo, getCheckoutItems, clearCheckoutItems, removeCartItems } from '../../utils/storage';
import { formatCNY } from '../../utils/format';
import type { CartItem } from '../../utils/storage';

Page({
  data: {
    items: [] as (CartItem & { displayPrice: string; lineTotal: string })[],
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
    subtotalDisplay: '',
    discountDisplay: '',
    totalDisplay: '',
    couponCode: '',
    couponApplied: false,
    couponError: '',
    paying: false,
    mode: 'cart' as 'cart' | 'buyNow' | 'selectedCart',
  },

  onLoad(query: Record<string, string | undefined>) {
    if (!requireAuth()) return;

    const mode = (query.mode || 'cart') as 'cart' | 'buyNow' | 'selectedCart';
    this.setData({ mode });

    let rawItems: CartItem[] = [];

    if (mode === 'buyNow') {
      const stored = wx.getStorageSync('wk_buy_now');
      if (stored) rawItems = [JSON.parse(stored) as CartItem];
    } else if (mode === 'selectedCart') {
      rawItems = getCheckoutItems();
    } else {
      rawItems = getCart();
    }

    if (!rawItems.length) {
      wx.showToast({ title: '没有可结算的商品', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const items = rawItems.map((item) => ({
      ...item,
      displayPrice: formatCNY(item.priceCents),
      lineTotal: formatCNY(item.priceCents * item.quantity),
    }));

    const subtotalCents = rawItems.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );

    this.setData({
      items,
      subtotalCents,
      totalCents: subtotalCents,
      subtotalDisplay: formatCNY(subtotalCents),
      totalDisplay: formatCNY(subtotalCents),
    });
  },

  onCouponInput(e: WechatMiniprogram.Input) {
    this.setData({ couponCode: e.detail.value, couponError: '' });
  },

  async onApplyCoupon() {
    const code = this.data.couponCode.trim();
    if (!code) return;

    try {
      const result = await validateCoupon(code, this.data.subtotalCents);
      const totalCents = Math.max(0, this.data.subtotalCents - result.discountCents);
      this.setData({
        discountCents: result.discountCents,
        discountDisplay: `-${formatCNY(result.discountCents)}`,
        totalCents,
        totalDisplay: formatCNY(totalCents),
        couponApplied: true,
        couponError: '',
      });
      wx.showToast({ title: '优惠券已生效', icon: 'success' });
    } catch (err) {
      this.setData({
        couponError: (err as Error).message || '无效优惠券',
        couponApplied: false,
        discountCents: 0,
        discountDisplay: '',
        totalCents: this.data.subtotalCents,
        totalDisplay: formatCNY(this.data.subtotalCents),
      });
    }
  },

  onRemoveCoupon() {
    this.setData({
      couponCode: '',
      couponApplied: false,
      couponError: '',
      discountCents: 0,
      discountDisplay: '',
      totalCents: this.data.subtotalCents,
      totalDisplay: formatCNY(this.data.subtotalCents),
    });
  },

  async onPay() {
    if (this.data.paying) return;
    this.setData({ paying: true });

    try {
      const user = getUserInfo();
      if (!user) {
        requireAuth();
        this.setData({ paying: false });
        return;
      }

      const orderItems = this.data.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const payParams = await createWechatOrder({
        items: orderItems,
        openid: user.id,
        couponCode: this.data.couponApplied ? this.data.couponCode : undefined,
      });

      await requestPayment(payParams);

      // Payment successful — clear relevant items and redirect
      if (this.data.mode === 'selectedCart') {
        const variantIds = this.data.items.map((item) => item.variantId);
        removeCartItems(variantIds);
        clearCheckoutItems();
      } else if (this.data.mode === 'cart') {
        clearCart();
      } else {
        wx.removeStorageSync('wk_buy_now');
      }

      wx.showToast({ title: '支付成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/orders/index' });
      }, 1500);
    } catch (err) {
      const msg = (err as Error).message || '支付失败';
      if (!msg.includes('取消')) {
        wx.showToast({ title: msg, icon: 'error' });
      }
    } finally {
      this.setData({ paying: false });
    }
  },
});
