import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OrdersService } from '../orders/orders.service';
import type { MailerService } from '../mailer/mailer.service';
import type { PaypalProvider } from './providers/paypal.provider';
import type { WechatPayProvider } from './providers/wechat-pay.provider';

/**
 * Refund-completed email triggers fire on:
 *   a) admin sync refund — when the provider returns SUCCESS immediately
 *   b) WeChat async refund notification — when the refund transitions to SUCCESS
 *   c) user-initiated grace-period cancellation of a DEPOSIT_PAID order
 * A mail failure must never break the refund path.
 */

function buildMailer(
  overrides: Partial<Record<keyof MailerService, ReturnType<typeof vi.fn>>> = {},
) {
  return {
    sendOrderRefundCompletedEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderPlacedPendingEmail: vi.fn().mockResolvedValue(undefined),
    sendShipmentNotificationEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MailerService & {
    sendOrderRefundCompletedEmail: ReturnType<typeof vi.fn>;
    sendOrderStatusUpdateEmail: ReturnType<typeof vi.fn>;
  };
}

function buildOrders(): OrdersService {
  return {
    releaseCoupon: vi.fn().mockResolvedValue(undefined),
    reserveCoupon: vi.fn(),
  } as unknown as OrdersService;
}

function buildProviders() {
  return {
    paypal: { createOrder: vi.fn(), captureOrder: vi.fn() } as unknown as PaypalProvider,
    wechat: {
      createOrder: vi.fn(),
      closeOrder: vi.fn(),
      refundOrder: vi.fn(),
      verifyNotificationTimestamp: vi.fn(),
      verifyNotificationSignature: vi.fn(),
      decryptNotificationResource: vi.fn(),
    } as unknown as WechatPayProvider,
  };
}

describe('PaymentsService.refundOrder — admin sync refund', () => {
  it('sends refund email when provider returns SUCCESS immediately', async () => {
    const order = {
      id: 'order-1',
      orderNo: 'WJK-1',
      email: 'buyer@example.com',
      fullName: 'Test Buyer',
      currency: 'CNY',
      locale: 'zh-CN',
      paymentStatus: 'PAID',
      totalPriceCents: 10000,
      wechatTransactionId: 'WX-TXN-1',
      couponCode: null,
      items: [{ variantId: 'v1', quantity: 1 }],
      refunds: [],
    };

    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue(order),
        update: vi.fn().mockResolvedValue(order),
      },
      refund: {
        create: vi.fn().mockResolvedValue({ id: 'refund-1', status: 'SUCCESS' }),
      },
      productVariant: { update: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    const mailer = buildMailer();
    const providers = buildProviders();
    (providers.wechat.refundOrder as any) = vi.fn().mockResolvedValue({
      refundId: 'WX-RF-1',
      status: 'SUCCESS',
    });

    const service = new PaymentsService(
      prisma,
      buildOrders(),
      mailer,
      providers.paypal,
      providers.wechat,
    );

    await service.refundOrder('order-1', 10000, 'customer request', 'admin-1');
    await Promise.resolve();

    expect(mailer.sendOrderRefundCompletedEmail).toHaveBeenCalledTimes(1);
    expect(mailer.sendOrderRefundCompletedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'WJK-1',
        refundAmountCents: 10000,
        currency: 'CNY',
        isFullRefund: true,
        locale: 'zh-CN',
      }),
    );
  });

  it('does NOT send refund email when provider returns PENDING (async path)', async () => {
    const order = {
      id: 'order-1',
      orderNo: 'WJK-2',
      email: 'buyer@example.com',
      fullName: 'Test Buyer',
      currency: 'CNY',
      locale: 'zh-CN',
      paymentStatus: 'PAID',
      totalPriceCents: 10000,
      wechatTransactionId: 'WX-TXN-2',
      couponCode: null,
      items: [{ variantId: 'v1', quantity: 1 }],
      refunds: [],
    };

    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue(order),
        update: vi.fn(),
      },
      refund: {
        create: vi.fn().mockResolvedValue({ id: 'refund-2', status: 'PENDING' }),
      },
      productVariant: { update: vi.fn() },
    } as unknown as PrismaService;

    const mailer = buildMailer();
    const providers = buildProviders();
    (providers.wechat.refundOrder as any) = vi.fn().mockResolvedValue({
      refundId: 'WX-RF-2',
      status: 'PROCESSING',
    });

    const service = new PaymentsService(
      prisma,
      buildOrders(),
      mailer,
      providers.paypal,
      providers.wechat,
    );

    await service.refundOrder('order-1', 5000, undefined, 'admin-1');
    await Promise.resolve();

    expect(mailer.sendOrderRefundCompletedEmail).not.toHaveBeenCalled();
  });

  it('does not throw when the mailer fails after a successful refund', async () => {
    const order = {
      id: 'order-1',
      orderNo: 'WJK-3',
      email: 'buyer@example.com',
      fullName: 'Test Buyer',
      currency: 'CNY',
      locale: 'zh-CN',
      paymentStatus: 'PAID',
      totalPriceCents: 10000,
      wechatTransactionId: 'WX-TXN-3',
      couponCode: null,
      items: [{ variantId: 'v1', quantity: 1 }],
      refunds: [],
    };

    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue(order),
        update: vi.fn().mockResolvedValue(order),
      },
      refund: {
        create: vi.fn().mockResolvedValue({ id: 'refund-3', status: 'SUCCESS' }),
      },
      productVariant: { update: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    const mailer = buildMailer({
      sendOrderRefundCompletedEmail: vi
        .fn()
        .mockRejectedValue(new Error('mail outage')),
    });
    const providers = buildProviders();
    (providers.wechat.refundOrder as any) = vi.fn().mockResolvedValue({
      refundId: 'WX-RF-3',
      status: 'SUCCESS',
    });

    const service = new PaymentsService(
      prisma,
      buildOrders(),
      mailer,
      providers.paypal,
      providers.wechat,
    );

    await expect(
      service.refundOrder('order-1', 10000, 'returned', 'admin-1'),
    ).resolves.toBeDefined();
    await Promise.resolve();

    expect(mailer.sendOrderRefundCompletedEmail).toHaveBeenCalledTimes(1);
  });
});

describe('PaymentsService.cancelUnpaidOrder — user-initiated cancel', () => {
  it('sends a CANCELLED status email after cancelling an UNPAID order', async () => {
    const order = {
      id: 'order-1',
      orderNo: 'WJK-CXL-1',
      email: 'buyer@example.com',
      fullName: 'Test Buyer',
      currency: 'CNY',
      locale: 'zh-CN',
      paymentStatus: 'UNPAID',
      couponCode: null,
      items: [{ variantId: 'v1', quantity: 1 }],
      refunds: [],
    };

    const tx = {
      productVariant: { update: vi.fn().mockResolvedValue({}) },
      order: { update: vi.fn().mockResolvedValue(order) },
      paymentIntent: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    const prisma = {
      order: { findFirst: vi.fn().mockResolvedValue(order) },
      $transaction: vi.fn(async (cb: (innerTx: typeof tx) => Promise<unknown>) =>
        cb(tx),
      ),
    } as unknown as PrismaService;

    const mailer = buildMailer();
    const providers = buildProviders();

    const service = new PaymentsService(
      prisma,
      buildOrders(),
      mailer,
      providers.paypal,
      providers.wechat,
    );

    await service.cancelUnpaidOrder('order-1', 'cust-1');
    await Promise.resolve();

    expect(mailer.sendOrderStatusUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'WJK-CXL-1',
        status: 'CANCELLED',
        locale: 'zh-CN',
      }),
    );
  });
});
