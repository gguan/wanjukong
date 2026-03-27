import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
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

    const data = await res.json() as { access_token: string };
    return data.access_token;
  }

  /**
   * Look up server-side prices and create a PayPal order.
   */
  async createPayPalOrderFromCart(
    cartItems: CartItemInput[],
    currency = 'USD',
  ): Promise<{ paypalOrderId: string; totalCents: number }> {
    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const variantIds = cartItems.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    const items = cartItems.map((ci) => {
      const variant = variants.find((v) => v.id === ci.variantId);
      if (!variant) throw new NotFoundException(`Variant ${ci.variantId} not found`);
      return {
        name: variant.product.name + (variant.name ? ` - ${variant.name}` : ''),
        unitPriceCents: variant.priceCents,
        quantity: ci.quantity,
      };
    });

    const totalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    const totalAmount = (totalCents / 100).toFixed(2);

    const accessToken = await this.getAccessToken();

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
            amount: {
              currency_code: currency,
              value: totalAmount,
              breakdown: {
                item_total: { currency_code: currency, value: totalAmount },
              },
            },
            items: items.map((item) => ({
              name: item.name,
              unit_amount: {
                currency_code: currency,
                value: (item.unitPriceCents / 100).toFixed(2),
              },
              quantity: String(item.quantity),
            })),
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(`PayPal create order failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json() as { id: string };
    return { paypalOrderId: data.id, totalCents };
  }

  async capturePayPalOrder(paypalOrderId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(`PayPal capture failed: ${JSON.stringify(err)}`);
    }

    return res.json();
  }
}
