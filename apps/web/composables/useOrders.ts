export interface OrderItem {
  id: string;
  productNameSnapshot: string;
  productSlugSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  brandNameSnapshot: string | null;
  categoryNameSnapshot: string | null;
  coverImageUrlSnapshot: string | null;
  scaleSnapshot: string | null;
  unitPriceCents: number;
  quantity: number;
  totalPriceCents: number;
  isPreorder: boolean;
  depositCents: number;
}

export interface Shipment {
  id: string;
  carrier: string;
  carrierName: string | null;
  trackingNumber: string;
  status: string;
  isInternational: boolean;
  shippedAt: string | null;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface Refund {
  id: string;
  amountCents: number;
  reason: string | null;
  status: string;
  processedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  channel: 'WEB' | 'MINIPROGRAM';
  fullName: string;
  email: string;
  phone: string | null;
  country: string;
  stateOrProvince: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  currency: string;
  couponCode: string | null;
  discountCents: number;
  subtotalPriceCents: number;
  totalPriceCents: number;
  isPreorder: boolean;
  depositCents: number;
  balanceCents: number;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  balanceDueBy: string | null;
  gracePeriodEndsAt: string | null;
  createdAt: string;
  items: OrderItem[];
  shipments: Shipment[];
  refunds: Refund[];
}

export function useOrders() {
  const { get } = usePublicApi();

  /**
   * Fetch an order by its order number. Authorization on the server:
   * either the caller's session matches the order's customerId, or the
   * caller presents the guest access token emailed at checkout.
   */
  function fetchOrderByNo(orderNo: string, token?: string) {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return get<Order>(`/public/orders/${orderNo}${query}`);
  }

  return { fetchOrderByNo };
}
