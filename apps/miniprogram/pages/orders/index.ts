import { fetchMyOrders } from '../../utils/api';
import { requireAuth } from '../../utils/auth';
import { formatCNY, formatDate, orderStatusLabel, paymentStatusLabel } from '../../utils/format';
import type { OrderSummary } from '../../utils/api';

interface OrderDisplay extends OrderSummary {
  displayTotal: string;
  displayDate: string;
  displayStatus: string;
  displayPayment: string;
  statusClass: string;
  firstImage: string;
}

Page({
  data: {
    orders: [] as OrderDisplay[],
    loading: true,
    isEmpty: true,
  },

  onLoad() {
    if (!requireAuth()) return;
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh());
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const rawOrders = await fetchMyOrders({ limit: 50 });
      const orders: OrderDisplay[] = rawOrders.map((order) => {
        const statusClassMap: Record<string, string> = {
          PENDING: 'badge-warning',
          CONFIRMED: 'badge-info',
          SHIPPED: 'badge-info',
          DELIVERED: 'badge-success',
          CANCELLED: 'badge-danger',
        };
        return {
          ...order,
          displayTotal: formatCNY(order.totalPriceCents),
          displayDate: formatDate(order.createdAt),
          displayStatus: orderStatusLabel(order.status),
          displayPayment: paymentStatusLabel(order.paymentStatus),
          statusClass: statusClassMap[order.status] || 'badge-info',
          firstImage: order.items[0]?.coverImageUrlSnapshot || '',
        };
      });
      this.setData({
        orders,
        loading: false,
        isEmpty: orders.length === 0,
      });
    } catch (err) {
      console.error('Failed to load orders:', err);
      this.setData({ loading: false });
    }
  },

  onTapOrder(e: WechatMiniprogram.TouchEvent) {
    const orderNo = e.currentTarget.dataset.orderNo;
    wx.navigateTo({ url: `/pages/order-detail/index?orderNo=${orderNo}` });
  },
});
