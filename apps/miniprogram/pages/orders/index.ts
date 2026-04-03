import { fetchMyOrders } from '../../utils/api';
import { requireAuth } from '../../utils/auth';
import { formatCNY, orderDisplayStatus } from '../../utils/format';
import type { OrderSummary } from '../../utils/api';

type TabKey = 'all' | 'unpaid' | 'shipping' | 'receiving';

interface OrderDisplay extends OrderSummary {
  displayTotal: string;
  displayStatus: string;
  showPayBtn: boolean;
  showCancelBtn: boolean;
  showViewBtn: boolean;
}

function mapOrder(order: OrderSummary): OrderDisplay {
  const isUnpaid = order.paymentStatus === 'UNPAID';
  const isPaid = order.paymentStatus === 'PAID';
  return {
    ...order,
    displayTotal: formatCNY(order.totalPriceCents),
    displayStatus: orderDisplayStatus(order.status, order.paymentStatus),
    showPayBtn: isUnpaid,
    showCancelBtn: isUnpaid,
    showViewBtn: isPaid,
  };
}

function filterOrders(orders: OrderDisplay[], tab: TabKey): OrderDisplay[] {
  if (tab === 'all') return orders;
  if (tab === 'unpaid') return orders.filter((o) => o.paymentStatus === 'UNPAID');
  if (tab === 'shipping') return orders.filter((o) => o.paymentStatus === 'PAID' && (o.status === 'PENDING' || o.status === 'CONFIRMED'));
  if (tab === 'receiving') return orders.filter((o) => o.paymentStatus === 'PAID' && o.status === 'SHIPPED');
  return orders;
}

Page({
  data: {
    statusBarHeight: 44,
    allOrders: [] as OrderDisplay[],
    orders: [] as OrderDisplay[],
    loading: true,
    isEmpty: true,
    activeTab: 'all' as TabKey,
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'unpaid', label: '待支付' },
      { key: 'shipping', label: '待发货' },
      { key: 'receiving', label: '待收货' },
    ],
  },

  onLoad() {
    if (!requireAuth()) return;
    const { statusBarHeight } = wx.getWindowInfo();
    this.setData({ statusBarHeight: statusBarHeight || 44 });
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
      const allOrders = rawOrders.map(mapOrder);
      const orders = filterOrders(allOrders, this.data.activeTab);
      this.setData({
        allOrders,
        orders,
        loading: false,
        isEmpty: orders.length === 0,
      });
    } catch (err) {
      console.error('Failed to load orders:', err);
      this.setData({ loading: false });
    }
  },

  onSwitchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as TabKey;
    const orders = filterOrders(this.data.allOrders, tab);
    this.setData({ activeTab: tab, orders, isEmpty: orders.length === 0 });
  },

  onTapOrder(e: WechatMiniprogram.TouchEvent) {
    const orderNo = e.currentTarget.dataset.orderNo as string;
    wx.navigateTo({ url: `/pages/order-detail/index?orderNo=${orderNo}` });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
