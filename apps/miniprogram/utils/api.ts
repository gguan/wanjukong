import { API_BASE_URL } from './config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  data: T;
  statusCode: number;
}

/**
 * Wrapper around wx.request with session cookie support.
 */
function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/api${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      success(res: ApiResponse<T>) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // Not authenticated — redirect to login
          wx.navigateTo({ url: '/pages/login/index' });
          reject(new Error('未登录'));
        } else {
          const msg =
            (res.data as Record<string, string>)?.message || `请求失败 (${res.statusCode})`;
          reject(new Error(msg));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'));
      },
    });
  });
}

// ─── Public API (storefront) ─────────────────────────────

export function fetchProducts(params?: Record<string, string>) {
  const qs = params
    ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    : '';
  return request<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
  }>(`/public/products${qs}`);
}

export function fetchProductBySlug(slug: string) {
  return request<Product>(`/public/products/${slug}`);
}

export function fetchCategories() {
  return request<Category[]>('/public/categories');
}

export function fetchBrands() {
  return request<Brand[]>('/public/brands');
}

// ─── Mini Program Auth ───────────────────────────────────

export function wechatLogin(code: string) {
  return request<{ customer: CustomerInfo }>(
    '/miniprogram/auth/wechat/login',
    { method: 'POST', data: { code } },
  );
}

export function bindPhone(code: string) {
  return request<{ phone: string }>(
    '/miniprogram/auth/bind-phone',
    { method: 'POST', data: { code } },
  );
}

export function logout() {
  return request('/miniprogram/auth/logout', { method: 'POST' });
}

// ─── Mini Program Payment ────────────────────────────────

export function createWechatOrder(data: {
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  openid: string;
  couponCode?: string;
}) {
  return request<WechatPayParams>(
    '/miniprogram/payment/wechat/create-order',
    { method: 'POST', data },
  );
}

// ─── Orders ──────────────────────────────────────────────

export function fetchMyOrders(params?: { page?: number; limit?: number }) {
  const qs = params
    ? '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
    : '';
  return request<{
    data: OrderSummary[];
    total: number;
  }>(`/public/orders/my${qs}`);
}

export function fetchOrderDetail(orderNo: string) {
  return request<OrderDetail>(`/public/orders/${orderNo}`);
}

// ─── Coupon ──────────────────────────────────────────────

export function validateCoupon(code: string, subtotalCents: number) {
  return request<{ discountCents: number; code: string }>(
    '/public/orders/validate-coupon',
    { method: 'POST', data: { code, subtotalCents } },
  );
}

// ─── Types ───────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  scale: string | null;
  imageUrl: string | null;
  displayAvailability: 'IN_STOCK' | 'PREORDER' | 'SOLD_OUT' | null;
  isPurchasable: boolean;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  usdPriceCents: number | null;
  stock: number;
  isDefault: boolean;
  isPurchasable: boolean;
  isSoldOut: boolean;
  coverImageUrl: string | null;
  specSummary: string | null;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface CustomerInfo {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
}

export interface WechatPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

export interface OrderSummary {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  totalPriceCents: number;
  currency: string;
  createdAt: string;
  items: Array<{
    productNameSnapshot: string;
    coverImageUrlSnapshot: string | null;
    quantity: number;
  }>;
}

export interface OrderDetail extends OrderSummary {
  fullName: string;
  email: string;
  phone: string | null;
  country: string;
  city: string;
  addressLine1: string;
  items: Array<{
    productNameSnapshot: string;
    variantNameSnapshot: string | null;
    coverImageUrlSnapshot: string | null;
    unitPriceCents: number;
    quantity: number;
    totalPriceCents: number;
  }>;
}
