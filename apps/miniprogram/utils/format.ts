/**
 * Format cents to CNY string: 29999 → "299.99"
 */
export function formatCNY(cents: number): string {
  return `¥ ${(cents / 100).toFixed(2)}`;
}

/**
 * Format cents to USD string: 4299 → "$42.99"
 */
export function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format price with optional dual currency
 */
export function formatPrice(priceCents: number, usdPriceCents?: number | null): string {
  const cny = formatCNY(priceCents);
  if (usdPriceCents) {
    return `${cny} / ${formatUSD(usdPriceCents)}`;
  }
  return cny;
}

/**
 * Format date string to Chinese locale
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format date with time
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Order status label
 */
export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待处理',
    CONFIRMED: '已确认',
    SHIPPED: '已发货',
    DELIVERED: '已签收',
    CANCELLED: '已取消',
  };
  return map[status] || status;
}

/**
 * Payment status label
 */
export function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    UNPAID: '未支付',
    DEPOSIT_PAID: '待付尾款',
    PAID: '已支付',
    FAILED: '支付失败',
    REFUNDED: '已退款',
  };
  return map[status] || status;
}

/**
 * Combined order display status for mini program UI.
 */
export function orderDisplayStatus(orderStatus: string, paymentStatus: string): string {
  if (paymentStatus === 'UNPAID') return '未支付';
  if (paymentStatus === 'DEPOSIT_PAID') return '待付尾款';
  if (paymentStatus === 'FAILED') return '支付失败';
  if (paymentStatus === 'REFUNDED') return '已退款';
  const map: Record<string, string> = {
    PENDING: '待发货',
    CONFIRMED: '待发货',
    SHIPPED: '待收货',
    DELIVERED: '已完成',
    CANCELLED: '已取消',
  };
  return map[orderStatus] || orderStatus;
}

/**
 * Format full datetime: "2026-04-03 10:35:26"
 */
export function formatDateTimeFull(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
