import { fetchOrderDetail } from '../../utils/api';
import { requireAuth } from '../../utils/auth';
import { formatCNY, formatDateTime, orderStatusLabel, paymentStatusLabel } from '../../utils/format';
import type { OrderDetail } from '../../utils/api';

Page({
  data: {
    order: null as OrderDetail | null,
    displayStatus: '',
    displayPayment: '',
    statusClass: '',
    displayDate: '',
    displayTotal: '',
    items: [] as Array<{
      productNameSnapshot: string;
      variantNameSnapshot: string | null;
      coverImageUrlSnapshot: string | null;
      displayUnitPrice: string;
      quantity: number;
      displayLineTotal: string;
    }>,
    hasShipping: false,
    loading: true,
  },

  onLoad(query: Record<string, string | undefined>) {
    if (!requireAuth()) return;

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

      const statusClassMap: Record<string, string> = {
        PENDING: 'badge-warning',
        CONFIRMED: 'badge-info',
        SHIPPED: 'badge-info',
        DELIVERED: 'badge-success',
        CANCELLED: 'badge-danger',
      };

      const items = order.items.map((item) => ({
        ...item,
        displayUnitPrice: formatCNY(item.unitPriceCents),
        displayLineTotal: formatCNY(item.totalPriceCents),
      }));

      this.setData({
        order,
        displayStatus: orderStatusLabel(order.status),
        displayPayment: paymentStatusLabel(order.paymentStatus),
        statusClass: statusClassMap[order.status] || 'badge-info',
        displayDate: formatDateTime(order.createdAt),
        displayTotal: formatCNY(order.totalPriceCents),
        items,
        hasShipping: !!(order.addressLine1 || order.city),
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load order:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onCopyOrderNo() {
    if (!this.data.order) return;
    wx.setClipboardData({ data: this.data.order.orderNo });
  },
});
