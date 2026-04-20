import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { MailerService } from '../mailer/mailer.service';
import { normalizeLocale } from '../mailer/locale.util';
import { PaypalProvider } from './providers/paypal.provider';
import { WechatPayProvider } from './providers/wechat-pay.provider';
import { deriveProductDisplayAvailability } from '../../utils/product-sale-state';
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
  couponCode?: string;
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
  locale?: string;
  /**
   * Caller's express-session. When present and the caller is a guest, we
   * stash the created order's id so a browser that loses the raw token
   * (e.g. idempotent retry, cleared URL) can still load its own order page.
   */
  session?: { orderIds?: string[] } & Record<string, unknown>;
}

// ─── WeChat Pay types ─────────────────────────────────────

interface CreateWechatOrderInput {
  items: CartItemInput[];
  customerId: string;
  couponCode?: string;
  addressId?: string;
  locale?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly mailerService: MailerService,
    private readonly paypalProvider: PaypalProvider,
    private readonly wechatPayProvider: WechatPayProvider,
  ) {}

  /**
   * Append a guest order's id to the caller's session so they can reopen
   * the order page on this browser without needing the raw access token in
   * the URL. Capped so a single browser can't accumulate unbounded state.
   */
  private rememberOrderInSession(
    session: { orderIds?: string[] } & Record<string, unknown>,
    orderId: string,
  ): void {
    const existing = Array.isArray(session.orderIds) ? session.orderIds : [];
    if (existing.includes(orderId)) return;
    const next = [...existing, orderId];
    session.orderIds = next.length > 20 ? next.slice(-20) : next;
  }

  // ═══════════════════════════════════════════════════════
  // PayPal — Web storefront
  // ═══════════════════════════════════════════════════════

  async createPayPalOrderFromCart(
    input: CreatePayPalOrderInput,
  ): Promise<{ paypalOrderId: string; totalCents: number; discountCents?: number }> {
    const { items: cartItems, currency = 'USD', customerId, email, couponCode } = input;

    if (!cartItems?.length) throw new BadRequestException('Cart is empty');

    const { items, totalCents, totalDepositCents, totalBalanceCents } =
      await this.resolveCartItems(cartItems, currency as 'CNY' | 'USD');

    // Reserve coupon (atomic CAS against usage limit) before calling PayPal.
    // Applied to balance first, then deposit — so a preorder user still pays
    // some deposit today even with a large coupon. Mirrors the WeChat path.
    let reservedCouponCode: string | null = null;
    let discountCents = 0;
    if (couponCode) {
      const couponResult = await this.ordersService.reserveCoupon(couponCode, totalCents);
      discountCents = couponResult.discountCents;
      reservedCouponCode = couponResult.code;
    }

    const unspentDiscount = Math.max(0, discountCents - totalBalanceCents);
    const depositAfterDiscount = Math.max(0, totalDepositCents - unspentDiscount);
    const amountToCharge = depositAfterDiscount;

    try {
      const result = await this.paypalProvider.createOrder({
        items: cartItems,
        amountCents: amountToCharge,
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
          amountCents: amountToCharge,
          cartSnapshotJson: JSON.stringify(cartItems),
          couponCode: reservedCouponCode,
          discountCents: discountCents || null,
          status: 'CREATED',
        },
      });

      return {
        paypalOrderId: result.providerOrderId,
        totalCents: amountToCharge,
        ...(discountCents ? { discountCents } : {}),
      };
    } catch (err) {
      // PayPal call or PI write failed — release the reserved coupon so the
      // limited-use counter doesn't leak.
      if (reservedCouponCode) {
        await this.ordersService.releaseCoupon(reservedCouponCode).catch(() => {});
      }
      throw err;
    }
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
      if (existing) {
        // Re-stash the orderId so a guest retrying capture in the same
        // browser can still auth into its own order page without a token.
        // (We can't re-derive the raw guestAccessToken after the original
        // capture — only its hash is persisted.)
        if (!existing.customerId && input.session) {
          this.rememberOrderInSession(input.session, existing.id);
        }
        return { orderNo: existing.orderNo };
      }
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
        // Release the coupon reservation made at create-order time.
        if (pi.couponCode) {
          await this.ordersService.releaseCoupon(pi.couponCode).catch(() => {});
        }
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
      locale: input.locale,
      paypalOrderId,
      customerId: customerId || undefined,
      guestAccessTokenHash,
      channel: 'WEB',
      // Coupon was reserved at create-order time; propagate to the Order so
      // the customer sees the discount and an admin can reconcile.
      couponCode: pi.couponCode || undefined,
      discountCents: pi.discountCents || undefined,
    });

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'ORDER_CREATED', orderId: order.id },
    });

    // Stash the guest order on the browser's session so the order page
    // still loads if the client loses the raw token (e.g. capture retry).
    if (!customerId && input.session) {
      this.rememberOrderInSession(input.session, order.id);
    }

    this.mailerService
      .sendOrderConfirmationEmail({
        email: input.email,
        name: input.fullName,
        orderNo: order.orderNo,
        items: order.items,
        totalPriceCents: order.totalPriceCents,
        currency: order.currency,
        guestAccessToken,
        locale: normalizeLocale(order.locale),
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
  ): Promise<{ payParams: Record<string, string>; orderNo: string }> {
    const { items: cartItems, customerId, couponCode, addressId } = input;

    if (!cartItems?.length) throw new BadRequestException('Cart is empty');

    // Resolve WeChat openid from customer record
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { wechatOpenId: true, name: true, email: true, phone: true },
    });
    if (!customer?.wechatOpenId) {
      throw new BadRequestException('未绑定微信，无法发起微信支付');
    }
    const openid = customer.wechatOpenId;

    // Validate items (stock, status, availability, preorder)
    const { totalCents, totalDepositCents, totalBalanceCents } = await this.resolveCartItems(cartItems);

    // Apply coupon if provided — atomically reserve to prevent double-use
    let reservedCouponCode: string | null = null;
    let discountCents = 0;
    if (couponCode) {
      const couponResult = await this.ordersService.reserveCoupon(couponCode, totalCents);
      discountCents = couponResult.discountCents;
      reservedCouponCode = couponResult.code;
    }

    // Apply discount to balance first, then deposit.
    // Ensures preorder users still pay a deposit even with large coupons.
    const balanceAfterDiscount = Math.max(0, totalBalanceCents - discountCents);
    const unspentDiscount = Math.max(0, discountCents - totalBalanceCents);
    const depositAfterDiscount = Math.max(0, totalDepositCents - unspentDiscount);

    // Amount to charge now = deposit (or full price for in-stock-only orders)
    const amountCents = depositAfterDiscount;

    // Resolve shipping address — verify ownership
    let shippingAddr: Record<string, string | null> | null = null;
    if (addressId) {
      const addr = await this.prisma.customerAddress.findFirst({
        where: { id: addressId, customerId },
      });
      if (addr) {
        shippingAddr = {
          fullName: addr.fullName,
          phone: addr.phone,
          country: addr.country,
          stateOrProvince: addr.stateOrProvince,
          city: addr.city,
          district: addr.district,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          postalCode: addr.postalCode,
        };
      }
    }

    // Step 1: Create the Order as UNPAID (reserves stock atomically)
    let order;
    try {
      order = await this.ordersService.createCartOrder({
        items: cartItems,
        fullName: shippingAddr?.fullName || customer.name || openid,
        email: customer.email || `wechat+${openid}@noreply.wanjukong.com`,
        phone: shippingAddr?.phone || customer.phone || undefined,
        currency: 'CNY',
        locale: input.locale ?? 'zh-CN',
        channel: 'MINIPROGRAM',
        couponCode: reservedCouponCode || undefined,
        discountCents: discountCents || undefined,
        customerId,
        country: shippingAddr?.country || 'CN',
        stateOrProvince: shippingAddr?.stateOrProvince || undefined,
        city: shippingAddr?.city || '',
        addressLine1: shippingAddr?.addressLine1 || '',
        addressLine2: shippingAddr?.addressLine2 || undefined,
        postalCode: shippingAddr?.postalCode || undefined,
        // No wechatTransactionId → paymentStatus = UNPAID
      });
    } catch (err) {
      // Rollback coupon if order creation (stock decrement) failed
      if (reservedCouponCode) {
        await this.ordersService.releaseCoupon(reservedCouponCode).catch(() => {});
      }
      throw err;
    }

    // Step 2: Call WeChat Pay API to get prepay params
    const outTradeNo = `WX-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    try {
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
          customerId,
          orderId: order.id,
          cartSnapshotJson: JSON.stringify(cartItems),
          shippingAddressJson: shippingAddr ? JSON.stringify(shippingAddr) : null,
          couponCode: reservedCouponCode,
          discountCents: discountCents || null,
          status: 'CREATED',
        },
      });

      return { payParams: result.clientPayload as Record<string, string>, orderNo: order.orderNo };
    } catch (err) {
      // WeChat API or PI write failed — roll back the UNPAID order to free stock
      this.logger.error('WeChat Pay API failed after order creation, rolling back', err);
      await this.cancelUnpaidOrder(order.id, customerId).catch((rollbackErr) => {
        this.logger.error('Failed to roll back UNPAID order after prepay failure', rollbackErr);
      });
      throw err;
    }
  }

  /**
   * Create a balance payment for a DEPOSIT_PAID preorder (WeChat).
   * Charges `balanceCents` and marks the PaymentIntent as isBalance=true
   * so the notification handler knows to flip the order to PAID.
   */
  async createWechatBalancePayment(
    orderId: string,
    customerId: string,
  ): Promise<Record<string, string>> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.paymentStatus !== 'DEPOSIT_PAID') {
      throw new BadRequestException('该订单不在待付尾款状态');
    }
    if (order.currency !== 'CNY') {
      throw new BadRequestException('该订单不是人民币订单');
    }
    if (order.balanceCents <= 0) {
      throw new BadRequestException('订单尾款金额为 0');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { wechatOpenId: true },
    });
    if (!customer?.wechatOpenId) {
      throw new BadRequestException('未绑定微信');
    }

    // Close any pending balance PaymentIntent for this order
    const pending = await this.prisma.paymentIntent.findMany({
      where: { orderId, isBalance: true, status: 'CREATED' },
    });
    for (const old of pending) {
      if (old.wechatOutTradeNo) {
        this.wechatPayProvider.closeOrder(old.wechatOutTradeNo).catch(() => {});
      }
    }
    if (pending.length) {
      await this.prisma.paymentIntent.updateMany({
        where: { orderId, isBalance: true, status: 'CREATED' },
        data: { status: 'FAILED' },
      });
    }

    const outTradeNo = `WXB-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const result = await this.wechatPayProvider.createOrder({
      items: [],
      amountCents: order.balanceCents,
      currency: 'CNY',
      outTradeNo,
      openid: customer.wechatOpenId,
    });

    await this.prisma.paymentIntent.create({
      data: {
        provider: 'WECHAT_PAY',
        wechatPrepayId: result.providerOrderId,
        wechatOutTradeNo: outTradeNo,
        currency: 'CNY',
        amountCents: order.balanceCents,
        customerId,
        orderId: order.id,
        cartSnapshotJson: '[]',
        isBalance: true,
        status: 'CREATED',
      },
    });

    return result.clientPayload as Record<string, string>;
  }

  /**
   * Authorize a caller to act on a specific order.
   * Returns the order if the caller is its owning customer OR presents the
   * matching guest access token. Throws NotFound otherwise (no enumeration).
   */
  private async authorizeOrderAccess(
    orderId: string,
    customerId: string | null,
    guestToken: string | null,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');

    // Logged-in customer must match.
    if (customerId && order.customerId === customerId) return order;

    // Guest path: order is a guest order AND the token matches.
    if (guestToken && order.guestAccessTokenHash) {
      const tokenHash = crypto.createHash('sha256').update(guestToken).digest('hex');
      if (
        tokenHash.length === order.guestAccessTokenHash.length &&
        crypto.timingSafeEqual(
          Buffer.from(tokenHash),
          Buffer.from(order.guestAccessTokenHash),
        )
      ) {
        return order;
      }
    }

    throw new NotFoundException('订单不存在');
  }

  /**
   * Create a balance payment for a DEPOSIT_PAID preorder (PayPal).
   * Returns PayPal order id; client must then call capture endpoint.
   *
   * Authorization: caller must own the order (logged-in customer match) OR
   * present the guest access token issued at original checkout.
   */
  async createPayPalBalancePayment(
    orderId: string,
    customerId: string | null,
    guestToken: string | null = null,
  ): Promise<{ paypalOrderId: string; amountCents: number }> {
    const order = await this.authorizeOrderAccess(orderId, customerId, guestToken);

    if (order.paymentStatus !== 'DEPOSIT_PAID') {
      throw new BadRequestException('Order is not in deposit-paid state');
    }
    if (order.currency !== 'USD') {
      throw new BadRequestException('Order is not in USD');
    }
    if (order.balanceCents <= 0) {
      throw new BadRequestException('Order has no balance due');
    }

    const result = await this.paypalProvider.createOrder({
      items: [],
      amountCents: order.balanceCents,
      currency: 'USD',
      outTradeNo: `PPB-${Date.now()}`,
      description: `Balance for order ${order.orderNo}`,
    });

    await this.prisma.paymentIntent.create({
      data: {
        provider: 'PAYPAL',
        paypalOrderId: result.providerOrderId,
        customerId: customerId || null,
        currency: 'USD',
        amountCents: order.balanceCents,
        cartSnapshotJson: '[]',
        orderId: order.id,
        isBalance: true,
        status: 'CREATED',
      },
    });

    return { paypalOrderId: result.providerOrderId, amountCents: order.balanceCents };
  }

  /**
   * Capture a PayPal balance payment (called after user approves on PayPal).
   *
   * Authorization: the PaymentIntent is looked up by paypalOrderId, then the
   * caller must own the associated order (session match) OR present the
   * guest access token. This prevents a third party who happens to learn
   * a PaypalOrderId from finalising someone else's order.
   */
  async capturePayPalBalance(
    paypalOrderId: string,
    customerId: string | null,
    guestToken: string | null = null,
  ): Promise<{ orderNo: string }> {
    const pi = await this.prisma.paymentIntent.findUnique({
      where: { paypalOrderId },
    });
    if (!pi || !pi.isBalance || !pi.orderId) {
      throw new NotFoundException('Balance payment not found');
    }

    // Authorization on the linked order.
    await this.authorizeOrderAccess(pi.orderId, customerId, guestToken);

    if (pi.status === 'ORDER_CREATED') {
      const order = await this.prisma.order.findUnique({ where: { id: pi.orderId } });
      return { orderNo: order!.orderNo };
    }

    const captureResult = await this.paypalProvider.captureOrder(paypalOrderId);
    const capturedAmount = captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    if (capturedAmount) {
      const capturedCents = Math.round(parseFloat(capturedAmount.value) * 100);
      if (capturedCents !== pi.amountCents) {
        await this.prisma.paymentIntent.update({
          where: { id: pi.id },
          data: { status: 'FAILED' },
        });
        throw new BadRequestException('Balance payment amount mismatch');
      }
    }

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'ORDER_CREATED', capturedAt: new Date() },
    });

    const order = await this.prisma.order.update({
      where: { id: pi.orderId },
      data: {
        paymentStatus: 'PAID',
        balancePaidAt: new Date(),
        balancePaypalOrderId: paypalOrderId,
      },
    });

    return { orderNo: order.orderNo };
  }

  /**
   * Retry payment for an existing UNPAID order.
   * Creates a new PaymentIntent + WeChat prepay order.
   */
  async retryWechatPayment(
    orderId: string,
    customerId: string,
  ): Promise<Record<string, string>> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId, paymentStatus: 'UNPAID' },
    });
    if (!order) throw new NotFoundException('未找到待支付订单');

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { wechatOpenId: true },
    });
    if (!customer?.wechatOpenId) {
      throw new BadRequestException('未绑定微信');
    }

    // Close any existing CREATED PaymentIntents for this order
    const oldIntents = await this.prisma.paymentIntent.findMany({
      where: { orderId, status: 'CREATED' },
    });
    for (const oldPi of oldIntents) {
      // Close the old WeChat prepay order first to prevent late charges
      if (oldPi.wechatOutTradeNo) {
        this.wechatPayProvider.closeOrder(oldPi.wechatOutTradeNo).catch(() => {});
      }
    }
    if (oldIntents.length) {
      await this.prisma.paymentIntent.updateMany({
        where: { orderId, status: 'CREATED' },
        data: { status: 'FAILED' },
      });
    }

    // Charge the first-stage amount. For preorder, this is the deposit;
    // for in-stock orders, deposit === total (computed at order creation).
    // We deliberately DO NOT charge totalPriceCents here — a preorder user
    // who cancels the wx.requestPayment sheet and retries should not be
    // silently upgraded to a full-price charge.
    const amountCents = order.depositCents > 0 ? order.depositCents : order.totalPriceCents;

    const outTradeNo = `WX-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const result = await this.wechatPayProvider.createOrder({
      items: [],
      amountCents,
      currency: 'CNY',
      outTradeNo,
      openid: customer.wechatOpenId,
    });

    await this.prisma.paymentIntent.create({
      data: {
        provider: 'WECHAT_PAY',
        wechatPrepayId: result.providerOrderId,
        wechatOutTradeNo: outTradeNo,
        currency: 'CNY',
        amountCents,
        customerId,
        orderId: order.id,
        cartSnapshotJson: '[]',
        status: 'CREATED',
      },
    });

    return result.clientPayload as Record<string, string>;
  }

  /**
   * Cancel an order by the customer.
   *
   * Rules (Sideshow-style grace period for preorders):
   * - UNPAID: direct cancel — restore stock + release coupon.
   * - DEPOSIT_PAID within `gracePeriodEndsAt`: refund deposit via the original
   *   channel (WeChat / PayPal), restore stock, release coupon.
   * - DEPOSIT_PAID after grace period: rejected (deposit is non-refundable;
   *   user must contact customer service).
   * - PAID / REFUNDED / FAILED: rejected (user cannot self-cancel).
   */
  async cancelUnpaidOrder(orderId: string, customerId: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { items: true, refunds: true },
    });
    if (!order) throw new NotFoundException('订单不存在');

    if (order.paymentStatus === 'UNPAID') {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
        });

        await tx.paymentIntent.updateMany({
          where: { orderId: order.id, status: 'CREATED' },
          data: { status: 'FAILED' },
        });
      });

      if (order.couponCode) {
        await this.ordersService.releaseCoupon(order.couponCode).catch(() => {});
      }
      return;
    }

    if (order.paymentStatus === 'DEPOSIT_PAID') {
      const now = new Date();
      if (!order.gracePeriodEndsAt || order.gracePeriodEndsAt <= now) {
        throw new BadRequestException(
          '定金支付已超过 24 小时宽限期，无法自助取消。如需取消请联系客服。',
        );
      }

      const depositPaidCents = order.depositCents;
      if (depositPaidCents <= 0) {
        throw new BadRequestException('订单无定金记录，无法取消');
      }

      // Refund the deposit through the original channel
      if (order.currency === 'CNY') {
        if (!order.wechatTransactionId) {
          throw new BadRequestException('订单无微信支付记录，无法退款');
        }
        const outRefundNo = `RF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const result = await this.wechatPayProvider.refundOrder({
          transactionId: order.wechatTransactionId,
          outRefundNo,
          refundCents: depositPaidCents,
          totalCents: depositPaidCents,
          reason: '24小时宽限期内用户取消订单',
        });

        await this.prisma.refund.create({
          data: {
            orderId: order.id,
            amountCents: depositPaidCents,
            reason: '24小时宽限期内用户取消（全额退定金）',
            status: result.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
            wechatRefundId: result.refundId,
            wechatRefundNo: outRefundNo,
            createdBy: customerId,
            processedAt: result.status === 'SUCCESS' ? new Date() : null,
          },
        });
      } else if (order.currency === 'USD') {
        // TODO: implement PayPal refund path — requires storing capture ID
        // and adding a refundOrder method to PaypalProvider. For now, USD
        // customers must contact support within the grace period.
        throw new BadRequestException(
          'USD orders cannot be cancelled automatically. Please contact customer service within 24 hours of payment for a full refund.',
        );
      } else {
        throw new BadRequestException(`不支持的订单币种：${order.currency}`);
      }

      // Restore stock + cancel order + release coupon
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
        });

        await tx.paymentIntent.updateMany({
          where: { orderId: order.id, status: 'CREATED' },
          data: { status: 'FAILED' },
        });
      });

      if (order.couponCode) {
        await this.ordersService.releaseCoupon(order.couponCode).catch(() => {});
      }
      return;
    }

    throw new BadRequestException('当前订单状态不允许自助取消，请联系客服');
  }

  /**
   * Clean up stale CREATED PaymentIntents and their associated UNPAID orders.
   * Closes WeChat prepay orders, marks PIs as FAILED, and cancels UNPAID orders
   * that no longer have any CREATED PaymentIntent (i.e., all retries expired).
   * This prevents abandoned orders from holding inventory forever.
   */
  async cleanupStalePaymentIntents(maxAgeMinutes = 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000);

    const staleIntents = await this.prisma.paymentIntent.findMany({
      where: {
        status: 'CREATED',
        createdAt: { lt: cutoff },
      },
    });

    if (!staleIntents.length) return 0;

    const affectedOrderIds = new Set<string>();
    let cleaned = 0;

    for (const pi of staleIntents) {
      try {
        await this.prisma.paymentIntent.update({
          where: { id: pi.id },
          data: { status: 'FAILED' },
        });

        if (pi.wechatOutTradeNo) {
          this.wechatPayProvider.closeOrder(pi.wechatOutTradeNo).catch(() => {});
        }

        if (pi.orderId) affectedOrderIds.add(pi.orderId);
        cleaned++;
      } catch (err) {
        this.logger.error(`Failed to clean up PaymentIntent ${pi.id}`, err);
      }
    }

    // Cancel UNPAID orders that have no remaining CREATED PaymentIntents
    for (const orderId of affectedOrderIds) {
      try {
        const hasActivePi = await this.prisma.paymentIntent.count({
          where: { orderId, status: 'CREATED' },
        });
        if (hasActivePi > 0) continue;

        const order = await this.prisma.order.findFirst({
          where: { id: orderId, paymentStatus: 'UNPAID' },
        });
        if (!order || !order.customerId) continue;

        await this.cancelUnpaidOrder(orderId, order.customerId);
        this.logger.log(`Auto-cancelled stale UNPAID order ${order.orderNo}`);
      } catch (err) {
        this.logger.error(`Failed to auto-cancel stale order ${orderId}`, err);
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale PaymentIntents (older than ${maxAgeMinutes}min)`);
    }
    return cleaned;
  }

  /**
   * Called when the user cancels wx.requestPayment() — only cancels the prepay,
   * NOT the order. The UNPAID order stays so user can retry from order detail.
   */
  async cancelWechatPayment(customerId: string): Promise<void> {
    const pi = await this.prisma.paymentIntent.findFirst({
      where: {
        customerId,
        provider: 'WECHAT_PAY',
        status: 'CREATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pi) return;

    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: { status: 'FAILED' },
    });

    // Close WeChat prepay (best-effort)
    if (pi.wechatOutTradeNo) {
      this.wechatPayProvider.closeOrder(pi.wechatOutTradeNo).catch(() => {});
    }
  }

  async handleWechatNotification(
    headers: WechatPayNotificationHeaders,
    body: WechatPayNotificationBody,
    rawBody: string,
  ): Promise<void> {
    const timestamp = headers['wechatpay-timestamp'];
    if (!this.wechatPayProvider.verifyNotificationTimestamp(timestamp)) {
      this.logger.warn('WeChat Pay notification timestamp out of range');
      return;
    }

    // Verify RSA-SHA256 signature against WeChat Pay public key
    if (!this.wechatPayProvider.verifyNotificationSignature(headers, rawBody)) {
      this.logger.warn('WeChat Pay notification signature verification failed');
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

    // Idempotency — treat ORDER_CREATED, FAILED, and CAPTURED as terminal.
    // FAILED means the intent was cancelled/expired and coupon already released.
    // Processing a late success notification would create an order without a valid coupon reservation.
    if (pi.status !== 'CREATED') {
      if (pi.status !== 'ORDER_CREATED') {
        this.logger.warn(
          `WeChat Pay: ignoring late SUCCESS notification for ${pi.status} intent ` +
            `(out_trade_no=${transaction.out_trade_no}). Manual refund may be needed.`,
        );
      }
      return;
    }

    // Verify payment amount matches what we expected
    const paidCents = transaction.amount?.payer_total ?? transaction.amount?.total;
    if (paidCents !== undefined && paidCents !== pi.amountCents) {
      this.logger.error(
        `WeChat Pay amount mismatch: expected ${pi.amountCents}, got ${paidCents} ` +
          `(out_trade_no=${transaction.out_trade_no})`,
      );
      await this.prisma.paymentIntent.update({
        where: { id: pi.id },
        data: { status: 'FAILED' },
      });
      // Release reserved coupon
      if (pi.couponCode) {
        await this.ordersService.releaseCoupon(pi.couponCode).catch(() => {});
      }
      return;
    }

    // Update PaymentIntent to CAPTURED
    await this.prisma.paymentIntent.update({
      where: { id: pi.id },
      data: {
        status: 'ORDER_CREATED',
        capturedAt: new Date(),
        wechatTransactionId: transaction.transaction_id,
      },
    });

    // Update existing Order based on whether this was a deposit or balance payment
    if (pi.orderId) {
      const existing = await this.prisma.order.findUnique({ where: { id: pi.orderId } });
      if (!existing) return;

      if (pi.isBalance) {
        // Balance payment for existing preorder
        await this.prisma.order.update({
          where: { id: pi.orderId },
          data: {
            paymentStatus: 'PAID',
            balancePaidAt: new Date(),
            balanceWechatTransactionId: transaction.transaction_id,
          },
        });
      } else {
        // Deposit or full payment
        // If order has balance > 0, this is deposit only → DEPOSIT_PAID
        // Otherwise full paid → PAID
        const newStatus = existing.balanceCents > 0 ? 'DEPOSIT_PAID' : 'PAID';
        await this.prisma.order.update({
          where: { id: pi.orderId },
          data: {
            paymentStatus: newStatus,
            depositPaidAt: new Date(),
            balancePaidAt: newStatus === 'PAID' ? new Date() : null,
            wechatTransactionId: transaction.transaction_id,
          },
        });
      }

      // Send confirmation email
      const openid = transaction.payer.openid;
      const customer = await this.prisma.customer.findFirst({
        where: { wechatOpenId: openid },
      });
      const order = await this.prisma.order.findUnique({
        where: { id: pi.orderId },
        include: { items: true },
      });

      if (customer?.email && order) {
        this.mailerService
          .sendOrderConfirmationEmail({
            email: customer.email,
            name: customer.name || openid,
            orderNo: order.orderNo,
            items: order.items,
            totalPriceCents: order.totalPriceCents,
            currency: order.currency,
            locale: normalizeLocale(order.locale),
          })
          .catch((err) =>
            this.logger.error('Failed to send WeChat order confirmation', err),
          );
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // Refund
  // ═══════════════════════════════════════════════════════

  /**
   * Initiate a refund for a PAID order.
   * Calls WeChat Pay refund API, creates Refund record, restores stock if full refund.
   */
  async refundOrder(
    orderId: string,
    amountCents: number,
    reason: string | undefined,
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, refunds: true },
    });

    if (!order) throw new NotFoundException('订单不存在');
    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException('只能对已支付订单发起退款');
    }

    // Calculate already-refunded amount
    const refundedCents = order.refunds
      .filter((r) => r.status === 'SUCCESS')
      .reduce((sum, r) => sum + r.amountCents, 0);

    const maxRefundable = order.totalPriceCents - refundedCents;
    if (amountCents <= 0 || amountCents > maxRefundable) {
      throw new BadRequestException(
        `退款金额无效，最多可退 ¥${(maxRefundable / 100).toFixed(2)}`,
      );
    }

    // Must have a WeChat transaction ID to refund
    if (!order.wechatTransactionId) {
      throw new BadRequestException('该订单没有微信支付记录，无法发起退款');
    }

    const outRefundNo = `RF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Call WeChat Pay refund API
    const result = await this.wechatPayProvider.refundOrder({
      transactionId: order.wechatTransactionId,
      outRefundNo,
      refundCents: amountCents,
      totalCents: order.totalPriceCents,
      reason,
    });

    // Create Refund record
    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        amountCents,
        reason,
        status: result.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
        wechatRefundId: result.refundId,
        wechatRefundNo: outRefundNo,
        createdBy: adminId,
        processedAt: result.status === 'SUCCESS' ? new Date() : null,
      },
    });

    // Check if this is a full refund (total refunded == total paid)
    const totalRefundedAfter = refundedCents + amountCents;
    const isFullRefund = totalRefundedAfter >= order.totalPriceCents;

    if (isFullRefund && (result.status === 'SUCCESS' || result.status === 'PROCESSING')) {
      // Update order payment status
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'REFUNDED' },
      });

      // Restore stock for all items
      for (const item of order.items) {
        if (item.variantId) {
          await this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Release coupon
      if (order.couponCode) {
        await this.ordersService.releaseCoupon(order.couponCode).catch(() => {});
      }
    }

    return refund;
  }

  /**
   * Handle WeChat Pay refund notification.
   * Updates Refund record status and order payment status accordingly.
   */
  async handleWechatRefundNotification(
    headers: WechatPayNotificationHeaders,
    body: WechatPayNotificationBody,
    rawBody: string,
  ): Promise<void> {
    // Verify timestamp
    if (!this.wechatPayProvider.verifyNotificationTimestamp(headers['wechatpay-timestamp'])) {
      this.logger.warn('WeChat refund notification timestamp out of range');
      return;
    }

    // Verify signature
    if (!this.wechatPayProvider.verifyNotificationSignature(headers, rawBody)) {
      this.logger.warn('WeChat refund notification signature verification failed');
      return;
    }

    if (body.event_type !== 'REFUND.SUCCESS' && body.event_type !== 'REFUND.ABNORMAL' && body.event_type !== 'REFUND.CLOSED') {
      return;
    }

    let resource: {
      out_refund_no: string;
      refund_id: string;
      refund_status: string; // SUCCESS | CLOSED | ABNORMAL
      transaction_id: string;
      amount: { refund: number; payer_refund: number };
    };

    try {
      resource = this.wechatPayProvider.decryptNotificationResource(body.resource) as any;
    } catch (err) {
      this.logger.error('Failed to decrypt refund notification', err);
      return;
    }

    const refund = await this.prisma.refund.findFirst({
      where: { wechatRefundNo: resource.out_refund_no },
      include: { order: { include: { items: true, refunds: true } } },
    });

    if (!refund) {
      this.logger.warn(`WeChat refund notification: no Refund for out_refund_no=${resource.out_refund_no}`);
      return;
    }

    // Already processed — idempotency
    if (refund.status === 'SUCCESS' || refund.status === 'FAILED') return;

    const newStatus = resource.refund_status === 'SUCCESS' ? 'SUCCESS'
      : resource.refund_status === 'ABNORMAL' || resource.refund_status === 'CLOSED' ? 'FAILED'
      : 'PENDING';

    await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: newStatus as any,
        wechatRefundId: resource.refund_id,
        processedAt: newStatus === 'SUCCESS' ? new Date() : null,
      },
    });

    this.logger.log(
      `Refund ${resource.out_refund_no} status: ${resource.refund_status} → ${newStatus}`,
    );

    if (newStatus === 'SUCCESS' && refund.order) {
      // Check if all refunds total up to full refund
      const allRefunds = refund.order.refunds;
      const totalRefunded = allRefunds
        .filter((r) => r.id === refund.id ? true : r.status === 'SUCCESS')
        .reduce((sum, r) => sum + r.amountCents, 0);

      if (totalRefunded >= refund.order.totalPriceCents) {
        // Full refund complete — update order status + restore stock
        await this.prisma.order.update({
          where: { id: refund.order.id },
          data: { paymentStatus: 'REFUNDED' },
        });

        for (const item of refund.order.items) {
          if (item.variantId) {
            await this.prisma.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        if (refund.order.couponCode) {
          await this.ordersService.releaseCoupon(refund.order.couponCode).catch(() => {});
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // Shared helpers
  // ═══════════════════════════════════════════════════════

  private async resolveCartItems(cartItems: CartItemInput[], currency: 'CNY' | 'USD' = 'CNY') {
    const variantIds = cartItems.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    const now = new Date();

    const items = cartItems.map((ci) => {
      const variant = variants.find((v) => v.id === ci.variantId);
      if (!variant) {
        throw new NotFoundException(`Variant ${ci.variantId} not found`);
      }

      const { product } = variant;

      // Validate product is active
      if (product.status !== 'ACTIVE') {
        throw new BadRequestException(`商品 "${product.name}" 未上架`);
      }

      // Validate availability (must be IN_STOCK or PREORDER)
      const availability = deriveProductDisplayAvailability({
        productStatus: product.status,
        saleType: product.saleType,
        preorderStartAt: product.preorderStartAt,
        preorderEndAt: product.preorderEndAt,
        now,
        variantStocks: [variant.stock],
      });
      if (availability !== 'IN_STOCK' && availability !== 'PREORDER') {
        throw new BadRequestException(`商品 "${product.name}" 暂不可购买`);
      }

      // Validate preorder window — if preorder, must be within start/end range
      if (product.saleType === 'PREORDER') {
        if (product.preorderStartAt && now < product.preorderStartAt) {
          throw new BadRequestException(`商品 "${product.name}" 尚未开始预售`);
        }
        if (product.preorderEndAt && now > product.preorderEndAt) {
          throw new BadRequestException(`商品 "${product.name}" 预售已结束`);
        }
      }

      // Validate stock
      if (variant.stock < ci.quantity) {
        throw new BadRequestException(`商品 "${product.name}" 库存不足`);
      }

      // Validate quantity max
      if (ci.quantity > 10) {
        throw new BadRequestException(`商品 "${product.name}" 单次最多购买10件`);
      }

      // Pick price field based on checkout currency
      const unitPriceCents = currency === 'USD'
        ? (variant.usdPriceCents ?? 0)
        : variant.priceCents;

      if (currency === 'USD' && !variant.usdPriceCents) {
        throw new BadRequestException(`商品 "${product.name}" 未配置美元价格`);
      }

      // Compute per-line deposit for preorder items
      const isPreorder = product.saleType === 'PREORDER';
      let depositCents = unitPriceCents * ci.quantity; // default: full price
      if (isPreorder) {
        const productDeposit = currency === 'USD'
          ? product.usdDepositCents
          : product.depositCents;
        if (productDeposit && productDeposit > 0) {
          depositCents = productDeposit * ci.quantity;
        }
        // Fallback: if no deposit configured, use 10% of unit price
        else {
          depositCents = Math.round(unitPriceCents * 0.1) * ci.quantity;
        }
        // Sanity: deposit should not exceed full price
        if (depositCents > unitPriceCents * ci.quantity) {
          depositCents = unitPriceCents * ci.quantity;
        }
      }

      return {
        name: product.name + (variant.name ? ` - ${variant.name}` : ''),
        unitPriceCents,
        quantity: ci.quantity,
        productId: ci.productId,
        variantId: ci.variantId,
        isPreorder,
        depositCents,
      };
    });

    const totalCents = items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    );
    const totalDepositCents = items.reduce((sum, i) => sum + i.depositCents, 0);
    const totalBalanceCents = totalCents - totalDepositCents;
    const hasPreorder = items.some((i) => i.isPreorder);

    return { items, totalCents, totalDepositCents, totalBalanceCents, hasPreorder };
  }
}
