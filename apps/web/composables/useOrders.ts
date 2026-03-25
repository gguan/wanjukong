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
}

export interface Order {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
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
  subtotalPriceCents: number;
  totalPriceCents: number;
  createdAt: string;
  items: OrderItem[];
}

export interface BuyNowPayload {
  productId: string;
  variantId: string;
  quantity: number;
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  stateOrProvince?: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
  currency?: string;
}

export function useOrders() {
  const { get, post } = usePublicApi();

  function createBuyNowOrder(payload: BuyNowPayload) {
    return post<Order>('/public/orders/buy-now', payload);
  }

  function fetchOrderByNo(orderNo: string) {
    return get<Order>(`/public/orders/${orderNo}`);
  }

  return { createBuyNowOrder, fetchOrderByNo };
}
