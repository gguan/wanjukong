import { createWechatOrder, cancelWechatPayment, validateCoupon, fetchAddresses } from '../../utils/api';
import { requestPayment } from '../../utils/payment';
import { ensureAuth } from '../../utils/auth';
import { getCart, clearCart, getCheckoutItems, clearCheckoutItems, removeCartItems } from '../../utils/storage';
import { formatCNY } from '../../utils/format';
import type { CartItem } from '../../utils/storage';
import type { Address } from '../../utils/api';

const SELECTED_ADDRESS_KEY = 'wk_selected_address';

function formatAddress(addr: Address): string {
  return [addr.stateOrProvince, addr.city, addr.district, addr.addressLine1]
    .filter(Boolean)
    .join(' ');
}

Page({
  data: {
    statusBarHeight: 44,
    items: [] as (CartItem & { displayPrice: string; lineTotal: string })[],
    address: null as (Address & { displayAddress: string }) | null,
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
    subtotalDisplay: '',
    discountDisplay: '',
    totalDisplay: '',
    totalQty: 0,
    earnedPoints: 0,
    couponCode: '',
    couponApplied: false,
    couponError: '',
    paying: false,
    mode: 'cart' as 'cart' | 'buyNow' | 'selectedCart',
  },

  async onLoad(query: Record<string, string | undefined>) {
    if (!(await ensureAuth())) return;

    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight: statusBarHeight || 44 });

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

    const totalQty = rawItems.reduce((sum, item) => sum + item.quantity, 0);
    const earnedPoints = Math.round(subtotalCents / 1000);

    this.setData({
      items,
      subtotalCents,
      totalCents: subtotalCents,
      subtotalDisplay: formatCNY(subtotalCents),
      totalDisplay: formatCNY(subtotalCents),
      totalQty,
      earnedPoints,
    });

    this.loadAddress();
  },

  onShow() {
    // Pick up any address selected from address list page
    const stored = wx.getStorageSync(SELECTED_ADDRESS_KEY);
    if (stored) {
      wx.removeStorageSync(SELECTED_ADDRESS_KEY);
      const addr = JSON.parse(stored) as Address;
      this.setData({
        address: { ...addr, displayAddress: formatAddress(addr) },
      });
    }
  },

  async loadAddress() {
    try {
      const list = await fetchAddresses();
      if (!list.length) return;
      // Use default address, or first one
      const addr = list.find((a) => a.isDefault) || list[0];
      this.setData({
        address: { ...addr, displayAddress: formatAddress(addr) },
      });
    } catch {
      // No address loaded — user can add one
    }
  },

  onGoBack() {
    wx.navigateBack();
  },

  onGoToAddress() {
    wx.navigateTo({ url: '/pages/address/index?from=checkout' });
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

    if (!this.data.address) {
      wx.showToast({ title: '请先添加收货地址', icon: 'none' });
      return;
    }

    this.setData({ paying: true });

    try {
      const orderItems = this.data.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const result = await createWechatOrder({
        items: orderItems,
        couponCode: this.data.couponApplied ? this.data.couponCode : undefined,
        addressId: this.data.address?.id,
      }) as unknown as { payParams: Record<string, string>; orderNo: string };

      // Clear cart immediately — order is already created (UNPAID)
      if (this.data.mode === 'selectedCart') {
        const variantIds = this.data.items.map((item) => item.variantId);
        removeCartItems(variantIds);
        clearCheckoutItems();
      } else if (this.data.mode === 'cart') {
        clearCart();
      } else {
        wx.removeStorageSync('wk_buy_now');
      }

      await requestPayment(result.payParams);

      // Payment successful — redirect to order detail
      wx.showToast({ title: '支付成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/order-detail/index?orderNo=${result.orderNo}` });
      }, 1500);
    } catch (err) {
      const msg = (err as Error).message || '支付失败';
      if (msg.includes('cancel') || msg.includes('取消')) {
        // User cancelled payment — close prepay only, order stays UNPAID for retry
        cancelWechatPayment().catch(() => {});
        wx.showToast({ title: '订单已创建，可在"我的订单"中继续支付', icon: 'none', duration: 3000 });
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/orders/index' });
        }, 2000);
      } else if (msg.includes('库存') || msg.includes('not available') || msg.includes('未上架')) {
        wx.showToast({ title: msg, icon: 'none' });
      } else {
        wx.showToast({ title: msg, icon: 'error' });
        cancelWechatPayment().catch(() => {});
      }
    } finally {
      this.setData({ paying: false });
    }
  },
});
