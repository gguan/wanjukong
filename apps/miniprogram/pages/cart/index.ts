import { getCart, setCart, setCheckoutItems } from '../../utils/storage';
import { formatCNY } from '../../utils/format';
import type { CartItem } from '../../utils/storage';

interface CartItemDisplay extends CartItem {
  displayPrice: string;
  preorderUpcoming: boolean;
}

Page({
  data: {
    items: [] as CartItemDisplay[],
    selected: [] as boolean[],
    selectedCount: 0,
    allSelected: false,
    totalDisplay: '¥ 0.00',
    totalCents: 0,
    totalCount: 0,
    isEmpty: true,
    statusBarHeight: 44,
    navBarBottom: 88,
  },

  onLoad() {
    const { statusBarHeight } = wx.getWindowInfo();
    const menuButton = wx.getMenuButtonBoundingClientRect();
    // 胶囊底部 + 8px 间距，确保内容不被遮挡
    const navBarBottom = menuButton.bottom ? menuButton.bottom + 4 : (statusBarHeight || 44) + 40;
    this.setData({ statusBarHeight: statusBarHeight || 44, navBarBottom });
  },

  onShow() {
    this.refreshCart();
  },

  refreshCart() {
    const raw = getCart();
    const now = Date.now();
    const items: CartItemDisplay[] = raw.map((item) => ({
      ...item,
      displayPrice: formatCNY(item.priceCents),
      preorderUpcoming: !!(item.preorderStartAt && new Date(item.preorderStartAt).getTime() > now),
    }));

    const prevSelected = this.data.selected;
    const selected = items.map((_, i) =>
      i < prevSelected.length ? prevSelected[i] : false,
    );

    const totalCount = raw.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ items, selected, totalCount, isEmpty: items.length === 0 });
    this.recalculate(items, selected);
  },

  recalculate(items: CartItemDisplay[], selected: boolean[]) {
    const selectedCount = selected.filter(Boolean).length;
    const allSelected = items.length > 0 && selected.every(Boolean);
    const totalCents = items.reduce((sum, item, i) =>
      selected[i] ? sum + item.priceCents * item.quantity : sum, 0,
    );
    this.setData({
      selectedCount,
      allSelected,
      totalCents,
      totalDisplay: formatCNY(totalCents),
    });
  },

  onToggleSelect(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.index as number;
    const item = this.data.items[idx];
    const now = Date.now();
    if (item.preorderStartAt && new Date(item.preorderStartAt).getTime() > now) {
      const d = new Date(item.preorderStartAt);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      wx.showModal({
        title: '预售商品',
        content: `预售时间为：${timeStr}`,
        showCancel: false,
        confirmText: '确定',
      });
      return;
    }
    const selected = [...this.data.selected];
    selected[idx] = !selected[idx];
    this.setData({ selected });
    this.recalculate(this.data.items, selected);
  },

  onToggleSelectAll() {
    const allSelected = !this.data.allSelected;
    const selected = this.data.items.map(() => allSelected);
    this.setData({ selected, allSelected });
    this.recalculate(this.data.items, selected);
  },

  onIncrease(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.index as number;
    const cart = getCart();
    if (cart[idx].quantity >= 10) {
      wx.showToast({ title: '单品最多购买10件', icon: 'none' });
      return;
    }
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
          const selected = [...this.data.selected];
          selected.splice(idx, 1);
          this.setData({ selected });
          this.refreshCart();
        }
      },
    });
  },

  onCheckout() {
    const { items, selected, selectedCount } = this.data;
    if (selectedCount === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }

    const now = Date.now();
    const upcomingItem = items.find((item, i) => {
      if (!selected[i] || !item.preorderStartAt) return false;
      return new Date(item.preorderStartAt).getTime() > now;
    });

    if (upcomingItem) {
      const d = new Date(upcomingItem.preorderStartAt!);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      wx.showModal({
        title: '预售商品',
        content: `预售时间为：${timeStr}`,
        showCancel: false,
        confirmText: '确定',
      });
      return;
    }

    const selectedItems = items.filter((_, i) => selected[i]);
    setCheckoutItems(selectedItems);
    wx.navigateTo({ url: '/pages/checkout/index?mode=selectedCart' });
  },

  onGoShopping() {
    wx.switchTab({ url: '/pages/product-list/index' });
  },
});
