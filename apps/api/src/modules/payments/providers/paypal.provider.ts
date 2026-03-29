import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  IPaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class PaypalProvider implements IPaymentProvider {
  readonly providerName = 'PAYPAL';
  private readonly logger = new Logger(PaypalProvider.name);

  private get baseUrl() {
    return process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
  }

  private get clientId() {
    return process.env.PAYPAL_CLIENT_ID || '';
  }

  private get clientSecret() {
    return process.env.PAYPAL_CLIENT_SECRET || '';
  }

  async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      throw new BadRequestException('Failed to authenticate with PayPal');
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { items, amountCents, currency, outTradeNo } = params;
    const totalAmount = (amountCents / 100).toFixed(2);
    const accessToken = await this.getAccessToken();

    // Build per-item breakdown for PayPal (requires variant prices pre-resolved by caller)
    const paypalItems = items.map((item) => ({
      name: item.variantId, // caller should pass name; kept simple here
      unit_amount: { currency_code: currency, value: '0.00' },
      quantity: String(item.quantity),
    }));

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: outTradeNo,
            amount: {
              currency_code: currency,
              value: totalAmount,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(
        `PayPal create order failed: ${JSON.stringify(err)}`,
      );
    }

    const data = (await res.json()) as { id: string };
    return {
      providerOrderId: data.id,
      clientPayload: { paypalOrderId: data.id },
    };
  }

  async captureOrder(paypalOrderId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const res = await fetch(
      `${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(
        `PayPal capture failed: ${JSON.stringify(err)}`,
      );
    }

    return res.json();
  }
}
