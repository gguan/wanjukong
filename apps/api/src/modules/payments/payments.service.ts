import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { MailerService } from '../mailer/mailer.service';
import { PaypalProvider } from './providers/paypal.provider';
import { WechatPayProvider } from './providers/wechat-pay.provider';
import type {
  WechatPayNotificationHeaders,
  WechatPayNotificationBody,
} from './providers/wechat-pay.provider';
import { CartItemInput } from './interfaces/payment-provider.interface';

// ─── PayPal types (unchanged public API) ─────────────────

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

// ─── WeChat Pay types ─────────────────────────────────────

interface CreateWechatOrderInput {
  items: CartItemInput[];
  openid: string;
  couponCode?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly mailerService: MailerService,
    private readonly paypalProvider: PaypalProvider,
    private readonly wechatPayProvider: WechatPayProvider,
  ) {}

  // ═══════════════════════════════════════════════════════
  // PayPal — Web storefront
  // ═══════════════════════════════════════════════════════

  async createPayPalOrderFromCart(
    input: CreatePayPalOrderInput,
  ): Promise<{ paypalOrderId: string; totalCents: number }> {
    const { items: cartItems, currency = 'USD', customerId, email } = input;

    if (!cartItems?.length) throw new BadRequestException('Cart is empty');

    const { items, totalCents } = await this.resolveCartItems(cartItems);

    const result = await this.paypalProvider.createOrder({
      items: cartItems,
      amountCents: totalCents,
      currency,
      outTradeNo: `PP-${Date.now()}`,
      description: items.map((i) => i.name).join(', '),
    });

    await this.prisma.paymentIntent.create({
      data: {
        provider: 'PAYPAL',
        paypalOrderId: result.providerOrderId,
        customerId: customerId || null,
        email: email || null,
        currency,
        amountCents: totalCents,
        cartSnapshotJson: JSON.stringify(cartItems),
        status: 'CREATED',
      },
    });

    return { paypalOrderId: result.providerOrderId, totalCents };
  }

  async captureAndCreateOrder(
    input: CapturePayPalOrderInput,
  ): Promise<{ orderNo: string; guestAccessToken?: string }> {
    const { paypalOrderId } = input;

    const pi = await this.prisma.paymentIntent.findUnique({
      where: { paypalOrderId },
    });
    if (!pi) throw new NotFoundException('Payment not found');

    // Idempotency
    if (pi.status === 'ORDER_CREATED' && pi.orderId) {
      const existing = await this.prisma.order.findUnique({
        where: { id: pi.orderId },
      });
      if (existing) return { orderNo: existing.orderNo };
    }

    const captureResult = await this.paypalProvider.captureOrder(paypalOrderId);

    // Verify captured amount
    const capturedAmount =
      captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    if (capturedAmount) {
      const capturedCents = Math.round(parseFloat(capturedAmount.value) * 100);
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

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'CAPTURED', capturedAt: new Date() },
    });

    const cartItems: CartItemInput[] = JSON.parse(pi.cartSnapshotJson);
    const customerId = input.customerId || pi.customerId;

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

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'ORDER_CREATED', orderId: order.id },
    });

    this.mailerService
      .sendOrderConfirmationEmail({
        email: input.email,
        name: input.fullName,
        orderNo: order.orderNo,
        items: order.items,
        totalPriceCents: order.totalPriceCents,
        currency: order.currency,
        guestAccessToken,
      })
      .catch((err) =>
        this.logger.error('Failed to send order confirmation email', err),
      );

    return {
      orderNo: order.orderNo,
      ...(guestAccessToken ? { guestAccessToken } : {}),
    };
  }

  // ═══════════════════════════════════════════════════════
  // WeChat Pay — Mini program
  // ═══════════════════════════════════════════════════════

  async createWechatOrder(
    input: CreateWechatOrderInput,
  ): Promise<Record<string, string>> {
    const { items: cartItems, openid, couponCode } = input;

    if (!cartItems?.length) throw new BadRequestException('Cart is empty');

    const { totalCents } = await this.resolveCartItems(cartItems);

    // Apply coupon if provided
    let amountCents = totalCents;
    if (couponCode) {
      const couponResult = await this.ordersService.validateCoupon(
        couponCode,
        totalCents,
      );
      amountCents = totalCents - couponResult.discountCents;
    }

    const outTradeNo = `WX-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const result = await this.wechatPayProvider.createOrder({
      items: cartItems,
      amountCents,
      currency: 'CNY',
      outTradeNo,
      openid,
    });

    await this.prisma.paymentIntent.create({
      data: {
        provider: 'WECHAT_PAY',
        wechatPrepayId: result.providerOrderId,
        wechatOutTradeNo: outTradeNo,
        currency: 'CNY',
        amountCents,
        cartSnapshotJson: JSON.stringify(cartItems),
        status: 'CREATED',
      },
    });

    return result.clientPayload as Record<string, string>;
  }

  async handleWechatNotification(
    headers: WechatPayNotificationHeaders,
    body: WechatPayNotificationBody,
  ): Promise<void> {
    const timestamp = headers['wechatpay-timestamp'];
    if (!this.wechatPayProvider.verifyNotificationTimestamp(timestamp)) {
      this.logger.warn('WeChat Pay notification timestamp out of range');
      return;
    }

    if (body.event_type !== 'TRANSACTION.SUCCESS') return;

    let transaction;
    try {
      transaction = this.wechatPayProvider.decryptNotificationResource(
        body.resource,
      );
    } catch (err) {
      this.logger.error('Failed to decrypt WeChat Pay notification', err);
      return;
    }

    if (transaction.trade_state !== 'SUCCESS') return;

    const pi = await this.prisma.paymentIntent.findFirst({
      where: { wechatOutTradeNo: transaction.out_trade_no },
    });
    if (!pi) {
      this.logger.warn(
        `WeChat Pay: no PaymentIntent for out_trade_no=${transaction.out_trade_no}`,
      );
      return;
    }

    // Idempotency
    if (pi.status === 'ORDER_CREATED') return;

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
        wechatTransactionId: transaction.transaction_id,
      },
    });

    // WeChat Pay orders are fulfilled without a shipping address — admin will contact buyer
    const cartItems: CartItemInput[] = JSON.parse(pi.cartSnapshotJson);
    const openid = transaction.payer.openid;

    // Look up customer by wechatOpenId if available
    const customer = await this.prisma.customer.findFirst({
      where: { wechatOpenId: openid },
    });

    const order = await this.ordersService.createCartOrder({
      items: cartItems,
      fullName: customer?.name || openid,
      email: customer?.email || `wechat+${openid}@noreply.wanjukong.com`,
      currency: 'CNY',
      wechatTransactionId: transaction.transaction_id,
      customerId: customer?.id,
      // Shipping address filled in later by customer/admin
      country: 'CN',
      city: '',
      addressLine1: '',
    });

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'ORDER_CREATED', orderId: order.id },
    });

    if (customer?.email) {
      this.mailerService
        .sendOrderConfirmationEmail({
          email: customer.email,
          name: customer.name || openid,
          orderNo: order.orderNo,
          items: order.items,
          totalPriceCents: order.totalPriceCents,
          currency: order.currency,
        })
        .catch((err) =>
          this.logger.error('Failed to send WeChat order confirmation', err),
        );
    }
  }

  // ═══════════════════════════════════════════════════════
  // Shared helpers
  // ═══════════════════════════════════════════════════════

  private async resolveCartItems(cartItems: CartItemInput[]) {
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
        name: variant.product.name + (variant.name ? ` - ${variant.name}` : ''),
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

    return { items, totalCents };
  }
}
