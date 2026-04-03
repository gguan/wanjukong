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
  customerId: string;
  couponCode?: string;
  addressId?: string;
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
    const { totalCents } = await this.resolveCartItems(cartItems);

    // Apply coupon if provided — atomically reserve to prevent double-use
    let reservedCouponCode: string | null = null;
    let discountCents = 0;
    if (couponCode) {
      const couponResult = await this.ordersService.reserveCoupon(couponCode, totalCents);
      discountCents = couponResult.discountCents;
      reservedCouponCode = couponResult.code;
    }
    const amountCents = totalCents - discountCents;

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

    const outTradeNo = `WX-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const result = await this.wechatPayProvider.createOrder({
      items: [],
      amountCents: order.totalPriceCents,
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
        amountCents: order.totalPriceCents,
        customerId,
        orderId: order.id,
        cartSnapshotJson: '[]',
        status: 'CREATED',
      },
    });

    return result.clientPayload as Record<string, string>;
  }

  /**
   * Cancel an UNPAID order — restore stock and release coupon.
   */
  async cancelUnpaidOrder(orderId: string, customerId: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId, paymentStatus: 'UNPAID' },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('未找到待支付订单');

    await this.prisma.$transaction(async (tx) => {
      // Restore stock for all items
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Cancel the order
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
      });

      // Cancel all CREATED PaymentIntents
      await tx.paymentIntent.updateMany({
        where: { orderId: order.id, status: 'CREATED' },
        data: { status: 'FAILED' },
      });
    });

    // Release coupon
    if (order.couponCode) {
      await this.ordersService.releaseCoupon(order.couponCode).catch(() => {});
    }
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

    // Update existing Order to PAID (order was created at checkout as UNPAID)
    if (pi.orderId) {
      await this.prisma.order.update({
        where: { id: pi.orderId },
        data: {
          paymentStatus: 'PAID',
          wechatTransactionId: transaction.transaction_id,
        },
      });

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

  // ═══════════════════════════════════════════════════════
  // Shared helpers
  // ═══════════════════════════════════════════════════════

  private async resolveCartItems(cartItems: CartItemInput[]) {
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

      return {
        name: product.name + (variant.name ? ` - ${variant.name}` : ''),
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
