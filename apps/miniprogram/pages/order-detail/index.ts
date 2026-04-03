import { fetchOrderDetail } from '../../utils/api';
import { requireAuth } from '../../utils/auth';
import { formatCNY, formatDateTimeFull, orderDisplayStatus } from '../../utils/format';
import type { OrderDetail } from '../../utils/api';

Page({
  data: {
    statusBarHeight: 44,
    order: null as OrderDetail | null,
    displayStatus: '',
    displayDate: '',
    displayTotal: '',
    displaySubtotal: '',
    earnedPoints: 0,
    items: [] as Array<{
      productNameSnapshot: string;
      variantNameSnapshot: string | null;
      coverImageUrlSnapshot: string | null;
      displayLineTotal: string;
      quantity: number;
    }>,
    hasShipping: false,
    shippingDisplay: '',
    loading: true,
  },

  onLoad(query: Record<string, string | undefined>) {
    if (!requireAuth()) return;

    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight: statusBarHeight || 44 });

    const orderNo = query.orderNo;
    if (!orderNo) {
      wx.showToast({ title: '订单不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadOrder(orderNo);
  },

  async loadOrder(orderNo: string) {
    this.setData({ loading: true });
    try {
      const order = await fetchOrderDetail(orderNo);

      const items = order.items.map((item) => ({
        ...item,
        displayLineTotal: formatCNY(item.totalPriceCents),
      }));

      // Build shipping address display
      const addrParts = [
        order.stateOrProvince,
        order.city,
        order.addressLine1,
      ].filter(Boolean);

      this.setData({
        order,
        displayStatus: orderDisplayStatus(order.status, order.paymentStatus),
        displayDate: formatDateTimeFull(order.createdAt),
        displayTotal: formatCNY(order.totalPriceCents),
        displaySubtotal: formatCNY(order.totalPriceCents),
        earnedPoints: Math.round(order.totalPriceCents / 1000),
        items,
        hasShipping: addrParts.length > 0,
        shippingDisplay: addrParts.join(' '),
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load order:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onGoBack() {
    wx.navigateBack();
  },

  onCopyOrderNo() {
    if (!this.data.order) return;
    wx.setClipboardData({ data: this.data.order.orderNo });
  },
});
