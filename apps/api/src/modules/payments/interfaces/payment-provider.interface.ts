export interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * Line-level breakdown used by PayPal to render an itemized receipt on the
 * buyer's order review page. Sum(unitAmountCents × quantity) − discountCents
 * MUST equal the parent amountCents or PayPal rejects the order with a
 * UNIT_AMOUNT_MISMATCH error, so the caller is responsible for passing
 * numbers that reconcile.
 */
export interface PaymentItemBreakdown {
  name: string;
  unitAmountCents: number;
  quantity: number;
  sku?: string;
}

export interface CreateOrderParams {
  items: CartItemInput[];
  amountCents: number;
  currency: string;
  outTradeNo: string; // our internal order reference
  description?: string;
  /** Line items to show on the payment provider's review page. Optional. */
  itemBreakdown?: PaymentItemBreakdown[];
  /** Coupon / promo discount applied to the line items. Optional. */
  discountCents?: number;
  // Provider-specific
  openid?: string; // WeChat Pay: payer openid
}

export interface CreateOrderResult {
  providerOrderId: string;
  /** Payload sent back to the client to initiate payment (e.g. PayPal orderId, WeChat sign params) */
  clientPayload: Record<string, unknown>;
}

export interface IPaymentProvider {
  readonly providerName: string;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
}
