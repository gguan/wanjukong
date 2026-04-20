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
    const {
      amountCents,
      currency,
      outTradeNo,
      itemBreakdown,
      discountCents,
    } = params;
    const totalAmount = (amountCents / 100).toFixed(2);
    const accessToken = await this.getAccessToken();

    // Build the purchase unit. We start with just the total and layer the
    // itemized breakdown on top only when the numbers reconcile — PayPal
    // rejects the whole order with UNIT_AMOUNT_MISMATCH if they don't, and
    // we'd rather drop itemization than fail the payment.
    const purchaseUnit: Record<string, unknown> = {
      custom_id: outTradeNo,
      amount: {
        currency_code: currency,
        value: totalAmount,
      },
    };

    if (itemBreakdown?.length) {
      // PayPal truncates item names at 127 chars; guard here so one long
      // product name doesn't poison the whole order.
      const items = itemBreakdown.map((i) => ({
        name: i.name.slice(0, 127),
        unit_amount: {
          currency_code: currency,
          value: (i.unitAmountCents / 100).toFixed(2),
        },
        quantity: String(i.quantity),
        ...(i.sku ? { sku: i.sku.slice(0, 127) } : {}),
      }));

      const itemTotalCents = itemBreakdown.reduce(
        (sum, i) => sum + i.unitAmountCents * i.quantity,
        0,
      );
      const discount = Math.max(0, discountCents ?? 0);
      const reconciled = itemTotalCents - discount;

      if (reconciled === amountCents) {
        const breakdown: Record<string, unknown> = {
          item_total: {
            currency_code: currency,
            value: (itemTotalCents / 100).toFixed(2),
          },
        };
        if (discount > 0) {
          breakdown.discount = {
            currency_code: currency,
            value: (discount / 100).toFixed(2),
          };
        }
        purchaseUnit.items = items;
        (purchaseUnit.amount as Record<string, unknown>).breakdown = breakdown;
      } else {
        this.logger.warn(
          `PayPal itemization skipped for ${outTradeNo}: items ${itemTotalCents}¢ − discount ${discount}¢ ≠ total ${amountCents}¢`,
        );
      }
    }

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [purchaseUnit],
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
