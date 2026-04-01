import { API_BASE_URL } from './config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
}

// ─── Session Cookie Management ───────────────────────────
// wx.request doesn't auto-send cookies like browsers do.
// We persist the session cookie from Set-Cookie headers and
// attach it to every subsequent request.

const SESSION_COOKIE_KEY = 'wk_session_cookie';

function getSessionCookie(): string {
  return wx.getStorageSync(SESSION_COOKIE_KEY) || '';
}

function saveSessionCookie(setCookieHeader: string | string[] | undefined): void {
  if (!setCookieHeader) return;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookies) {
    // Extract "connect.sid=xxx" (or whatever session cookie name)
    const match = cookie.match(/^([^=]+=[^;]+)/);
    if (match) {
      wx.setStorageSync(SESSION_COOKIE_KEY, match[1]);
    }
  }
}

/**
 * Wrapper around wx.request with session cookie support.
 * Automatically persists and sends session cookies.
 */
function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cookie = getSessionCookie();
    wx.request({
      url: `${API_BASE_URL}/api${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...options.header,
      },
      success(res: WechatMiniprogram.RequestSuccessCallbackResult) {
        // Persist session cookie from response
        const header = res.header || {};
        saveSessionCookie(header['Set-Cookie'] || header['set-cookie']);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
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
  addressId?: string;
}) {
  return request<WechatPayParams>(
    '/miniprogram/payment/wechat/create-order',
    { method: 'POST', data },
  );
}

// ─── Orders ──────────────────────────────────────────────

export function fetchMyOrders() {
  return request<OrderSummary[]>('/public/account/orders');
}

export function fetchOrderDetail(orderNo: string) {
  return request<OrderDetail>(`/public/account/orders/${orderNo}`);
}

// ─── Profile & Address ───────────────────────────────────

export function fetchProfile() {
  return request<CustomerInfo>('/public/account/profile');
}

export function updateProfile(data: { name?: string; phone?: string }) {
  return request<CustomerInfo>('/public/account/profile', {
    method: 'PUT',
    data,
  });
}

export function fetchAddresses() {
  return request<Address[]>('/public/account/addresses');
}

export function createAddress(data: AddressInput) {
  return request<Address>('/public/account/addresses', {
    method: 'POST',
    data,
  });
}

export function updateAddress(id: string, data: Partial<AddressInput>) {
  return request<Address>(`/public/account/addresses/${id}`, {
    method: 'PUT',
    data,
  });
}

export function deleteAddress(id: string) {
  return request(`/public/account/addresses/${id}`, { method: 'DELETE' });
}

export function setDefaultAddress(id: string) {
  return request(`/public/account/addresses/${id}/set-default`, {
    method: 'POST',
  });
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
  scale: string | null;
  imageUrl: string | null;
  displayAvailability: 'IN_STOCK' | 'PREORDER' | 'SOLD_OUT' | null;
  isPurchasable: boolean;
  saleType: 'IN_STOCK' | 'PREORDER';
  preorderStartAt: string | null;
  preorderEndAt: string | null;
  depositCents: number | null;
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

export interface Address {
  id: string;
  label: string | null;
  fullName: string;
  phone: string | null;
  country: string;
  stateOrProvince: string | null;
  city: string;
  district: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string;
  fullName: string;
  phone?: string;
  country: string;
  stateOrProvince?: string;
  city: string;
  district?: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
  isDefault?: boolean;
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
