export interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CreateOrderParams {
  items: CartItemInput[];
  amountCents: number;
  currency: string;
  outTradeNo: string; // our internal order reference
  description?: string;
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
