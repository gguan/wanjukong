import { getCart, setCart } from '../../utils/storage';
import { formatCNY } from '../../utils/format';
import type { CartItem } from '../../utils/storage';

interface CartItemDisplay extends CartItem {
  displayPrice: string;
}

Page({
  data: {
    items: [] as CartItemDisplay[],
    totalDisplay: '',
    totalCents: 0,
    isEmpty: true,
  },

  onShow() {
    this.refreshCart();
  },

  refreshCart() {
    const raw = getCart();
    const items: CartItemDisplay[] = raw.map((item) => ({
      ...item,
      displayPrice: formatCNY(item.priceCents),
    }));
    const totalCents = raw.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    this.setData({
      items,
      totalCents,
      totalDisplay: formatCNY(totalCents),
      isEmpty: items.length === 0,
    });
  },

  onIncrease(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.index as number;
    const cart = getCart();
    cart[idx].quantity += 1;
    setCart(cart);
    this.refreshCart();
  },

  onDecrease(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.index as number;
    const cart = getCart();
    if (cart[idx].quantity <= 1) {
      this.removeItem(idx);
      return;
    }
    cart[idx].quantity -= 1;
    setCart(cart);
    this.refreshCart();
  },

  onDelete(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.index as number;
    this.removeItem(idx);
  },

  removeItem(idx: number) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          const cart = getCart();
          cart.splice(idx, 1);
          setCart(cart);
          this.refreshCart();
        }
      },
    });
  },

  onCheckout() {
    if (this.data.isEmpty) return;
    wx.navigateTo({ url: '/pages/checkout/index?mode=cart' });
  },

  onGoShopping() {
    wx.switchTab({ url: '/pages/product-list/index' });
  },
});
