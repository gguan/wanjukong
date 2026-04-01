const KEYS = {
  SESSION_ID: 'wk_session_id',
  USER_INFO: 'wk_user_info',
  CART: 'wk_cart',
} as const;

export function getSessionId(): string | null {
  return wx.getStorageSync(KEYS.SESSION_ID) || null;
}

export function setSessionId(id: string): void {
  wx.setStorageSync(KEYS.SESSION_ID, id);
}

export function clearSession(): void {
  wx.removeStorageSync(KEYS.SESSION_ID);
  wx.removeStorageSync(KEYS.USER_INFO);
}

export interface UserInfo {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
}

export function getUserInfo(): UserInfo | null {
  const raw = wx.getStorageSync(KEYS.USER_INFO);
  return raw ? (JSON.parse(raw) as UserInfo) : null;
}

export function setUserInfo(info: UserInfo): void {
  wx.setStorageSync(KEYS.USER_INFO, JSON.stringify(info));
}

export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  imageUrl: string;
  priceCents: number;
  quantity: number;
  preorderStartAt?: string | null;
}

export function getCart(): CartItem[] {
  const raw = wx.getStorageSync(KEYS.CART);
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}

export function setCart(items: CartItem[]): void {
  wx.setStorageSync(KEYS.CART, JSON.stringify(items));
}

export function clearCart(): void {
  wx.removeStorageSync(KEYS.CART);
}

// ─── Checkout items (selected subset of cart) ────────────

export function getCheckoutItems(): CartItem[] {
  const raw = wx.getStorageSync('wk_checkout_items');
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}

export function setCheckoutItems(items: CartItem[]): void {
  wx.setStorageSync('wk_checkout_items', JSON.stringify(items));
}

export function clearCheckoutItems(): void {
  wx.removeStorageSync('wk_checkout_items');
}

/** 结算后从购物车移除已付款的商品 */
export function removeCartItems(variantIds: string[]): void {
  const idSet = new Set(variantIds);
  const remaining = getCart().filter((item) => !idSet.has(item.variantId));
  setCart(remaining);
}
