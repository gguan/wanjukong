import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

interface CreatePayPalOrderInput {
  items: CartItemInput[];
  currency?: string;
  customerId?: string;
  email?: string;
}

interface CapturePayPalOrderInput {
  paypalOrderId: string;
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
  customerId?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

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

  /**
   * Look up server-side prices, create a local PaymentIntent, then create PayPal order.
   */
  async createPayPalOrderFromCart(
    input: CreatePayPalOrderInput,
  ): Promise<{ paypalOrderId: string; totalCents: number }> {
    const { items: cartItems, currency = 'USD', customerId, email } = input;

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
      if (!variant)
        throw new NotFoundException(`Variant ${ci.variantId} not found`);
      return {
        name:
          variant.product.name +
          (variant.name ? ` - ${variant.name}` : ''),
        unitPriceCents: variant.priceCents,
        quantity: ci.quantity,
        productId: ci.productId,
        variantId: ci.variantId,
      };
    });

    const totalCents = items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    );
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
                item_total: {
                  currency_code: currency,
                  value: totalAmount,
                },
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
      throw new BadRequestException(
        `PayPal create order failed: ${JSON.stringify(err)}`,
      );
    }

    const data = (await res.json()) as { id: string };

    // Persist local PaymentIntent
    await this.prisma.paymentIntent.create({
      data: {
        provider: 'PAYPAL',
        paypalOrderId: data.id,
        customerId: customerId || null,
        email: email || null,
        currency,
        amountCents: totalCents,
        cartSnapshotJson: JSON.stringify(cartItems),
        status: 'CREATED',
      },
    });

    return { paypalOrderId: data.id, totalCents };
  }

  /**
   * Idempotent capture: captures PayPal payment, creates local order exactly once.
   * Returns { orderNo, guestAccessToken? }
   */
  async captureAndCreateOrder(
    input: CapturePayPalOrderInput,
  ): Promise<{ orderNo: string; guestAccessToken?: string }> {
    const { paypalOrderId } = input;

    // 1. Find local PaymentIntent
    const pi = await this.prisma.paymentIntent.findUnique({
      where: { paypalOrderId },
    });
    if (!pi) {
      throw new NotFoundException('Payment not found');
    }

    // 2. Idempotency: if order already created, return it
    if (pi.status === 'ORDER_CREATED' && pi.orderId) {
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: pi.orderId },
      });
      if (existingOrder) {
        return { orderNo: existingOrder.orderNo };
      }
    }

    // 3. Capture PayPal order (safe to retry — PayPal returns COMPLETED for already-captured)
    const captureResult = await this.capturePayPalOrder(paypalOrderId);

    // 4. Verify captured amount matches
    const capturedAmount =
      captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    if (capturedAmount) {
      const capturedCents = Math.round(
        parseFloat(capturedAmount.value) * 100,
      );
      if (capturedCents !== pi.amountCents) {
        this.logger.error(
          `Amount mismatch: expected ${pi.amountCents}, got ${capturedCents}`,
        );
        await this.prisma.paymentIntent.update({
          where: { id: pi.id },
          data: { status: 'FAILED' },
        });
        throw new BadRequestException('Payment amount mismatch');
      }
    }

    // 5. Mark as captured
    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'CAPTURED', capturedAt: new Date() },
    });

    // 6. Parse cart snapshot and create the order
    const cartItems: CartItemInput[] = JSON.parse(pi.cartSnapshotJson);
    const customerId = input.customerId || pi.customerId;

    // Generate guest access token if no customer
    let guestAccessToken: string | undefined;
    let guestAccessTokenHash: string | undefined;
    if (!customerId) {
      guestAccessToken = crypto.randomBytes(32).toString('hex');
      guestAccessTokenHash = crypto
        .createHash('sha256')
        .update(guestAccessToken)
        .digest('hex');
    }

    const order = await this.ordersService.createCartOrder({
      items: cartItems,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      stateOrProvince: input.stateOrProvince,
      city: input.city,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      postalCode: input.postalCode,
      currency: input.currency,
      paypalOrderId,
      customerId: customerId || undefined,
      guestAccessTokenHash,
    });

    // 7. Link order to PaymentIntent
    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'ORDER_CREATED', orderId: order.id },
    });

    return {
      orderNo: order.orderNo,
      ...(guestAccessToken ? { guestAccessToken } : {}),
    };
  }

  private async capturePayPalOrder(paypalOrderId: string): Promise<any> {
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
