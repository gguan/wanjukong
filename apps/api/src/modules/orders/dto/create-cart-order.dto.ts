export class CartItemDto {
  productId!: string;
  variantId!: string;
  quantity!: number;
}

export class CreateCartOrderDto {
  items!: CartItemDto[];

  // Contact
  fullName!: string;
  email!: string;
  phone?: string;

  // Shipping
  country!: string;
  stateOrProvince?: string;
  city!: string;
  addressLine1!: string;
  addressLine2?: string;
  postalCode?: string;

  currency?: string;
  couponCode?: string;
  discountCents?: number;
  paypalOrderId?: string;
  wechatTransactionId?: string;
  customerId?: string;
  guestAccessTokenHash?: string;
  locale?: string;
  /**
   * Sales channel — "WEB" for storefront/PayPal, "MINIPROGRAM" for the
   * WeChat mini program. Caller is responsible for setting this; the
   * service does not infer it from currency or payment provider.
   */
  channel?: 'WEB' | 'MINIPROGRAM';
}
