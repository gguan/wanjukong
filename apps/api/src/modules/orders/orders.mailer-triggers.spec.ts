import { describe, expect, it, vi } from 'vitest';
import { OrdersService } from './orders.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MailerService } from '../mailer/mailer.service';
import type { CreateBuyNowOrderDto } from './dto/create-buy-now-order.dto';
import type { CreateCartOrderDto } from './dto/create-cart-order.dto';

/**
 * Verifies that OrdersService dispatches the correct transactional email
 * for each order-state transition, and that a mailer failure never breaks
 * the order flow (fire-and-forget, never awaited by callers).
 */

function buildMailer(overrides: Partial<Record<keyof MailerService, ReturnType<typeof vi.fn>>> = {}) {
  return {
    sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderPlacedPendingEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderRefundCompletedEmail: vi.fn().mockResolvedValue(undefined),
    sendShipmentNotificationEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MailerService & {
    sendOrderConfirmationEmail: ReturnType<typeof vi.fn>;
    sendOrderStatusUpdateEmail: ReturnType<typeof vi.fn>;
    sendOrderPlacedPendingEmail: ReturnType<typeof vi.fn>;
    sendOrderRefundCompletedEmail: ReturnType<typeof vi.fn>;
    sendShipmentNotificationEmail: ReturnType<typeof vi.fn>;
  };
}

function buildBuyNowDto(): CreateBuyNowOrderDto {
  return {
    productId: 'product-1',
    variantId: 'variant-1',
    quantity: 1,
    fullName: 'Test Buyer',
    email: 'buyer@example.com',
    country: 'CN',
    city: 'Shanghai',
    addressLine1: 'Road 1',
    locale: 'zh-CN',
  } as CreateBuyNowOrderDto;
}

function buildBuyNowPrisma(orderOverride: Record<string, unknown> = {}) {
  const order = {
    id: 'order-1',
    orderNo: 'WJK-20260526-XXXXX',
    email: 'buyer@example.com',
    fullName: 'Test Buyer',
    totalPriceCents: 12999,
    currency: 'CNY',
    locale: 'zh-CN',
    paymentStatus: 'UNPAID',
    items: [
      {
        productNameSnapshot: 'Raiden',
        variantNameSnapshot: 'Standard',
        skuSnapshot: 'raiden-std',
        quantity: 1,
        unitPriceCents: 12999,
        totalPriceCents: 12999,
      },
    ],
    ...orderOverride,
  };

  const tx = {
    productVariant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    order: { create: vi.fn().mockResolvedValue(order) },
  };

  return {
    prisma: {
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'product-1',
          name: 'Raiden',
          slug: 'raiden',
          status: 'ACTIVE',
          saleType: 'IN_STOCK',
          preorderStartAt: null,
          preorderEndAt: null,
          imageUrl: null,
          scale: '1/6',
          brand: null,
          category: null,
        }),
      },
      productVariant: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'variant-1',
          productId: 'product-1',
          name: 'Standard',
          sku: 'raiden-std',
          priceCents: 12999,
          stock: 5,
        }),
      },
      $transaction: vi.fn(async (cb: (innerTx: typeof tx) => Promise<unknown>) =>
        cb(tx),
      ),
    } as unknown as PrismaService,
    tx,
    order,
  };
}

function buildCartDto(over: Partial<CreateCartOrderDto> = {}): CreateCartOrderDto {
  return {
    items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 1 }],
    fullName: 'Test Buyer',
    email: 'buyer@example.com',
    country: 'CN',
    city: 'Shanghai',
    addressLine1: 'Road 1',
    currency: 'CNY',
    locale: 'zh-CN',
    channel: 'MINIPROGRAM',
    customerId: 'cust-1',
    ...over,
  } as CreateCartOrderDto;
}

function buildCartPrisma(orderOverride: Record<string, unknown> = {}) {
  const order = {
    id: 'order-1',
    orderNo: 'WJK-20260526-CART',
    email: 'buyer@example.com',
    fullName: 'Test Buyer',
    totalPriceCents: 12999,
    currency: 'CNY',
    locale: 'zh-CN',
    paymentStatus: 'UNPAID',
    items: [
      {
        productNameSnapshot: 'Raiden',
        variantNameSnapshot: 'Standard',
        skuSnapshot: 'raiden-std',
        quantity: 1,
        unitPriceCents: 12999,
        totalPriceCents: 12999,
      },
    ],
    ...orderOverride,
  };

  const tx = {
    productVariant: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    order: { create: vi.fn().mockResolvedValue(order) },
    $queryRaw: vi
      .fn()
      .mockResolvedValue([{ id: 'variant-1', stock: 5 }]),
  };

  return {
    prisma: {
      productVariant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'variant-1',
            productId: 'product-1',
            priceCents: 12999,
            usdPriceCents: 12999,
            stock: 5,
            coverImageUrl: null,
            name: 'Standard',
            sku: 'raiden-std',
            product: {
              id: 'product-1',
              name: 'Raiden',
              slug: 'raiden',
              status: 'ACTIVE',
              saleType: 'IN_STOCK',
              preorderStartAt: null,
              preorderEndAt: null,
              imageUrl: null,
              scale: '1/6',
              depositCents: null,
              usdDepositCents: null,
              brand: null,
              category: null,
            },
          },
        ]),
      },
      $transaction: vi.fn(async (cb: (innerTx: typeof tx) => Promise<unknown>) => {
        // Implement raw query passthrough used inside the tx.
        (tx as any).$queryRaw = tx.$queryRaw;
        return cb(tx);
      }),
    } as unknown as PrismaService,
    tx,
    order,
  };
}

describe('OrdersService — pending-payment email triggers', () => {
  it('sends pending-payment email when createBuyNow yields an UNPAID order', async () => {
    const { prisma } = buildBuyNowPrisma();
    const mailer = buildMailer();
    const service = new OrdersService(prisma, mailer);

    await service.createBuyNow(buildBuyNowDto());

    // fire-and-forget — yield one microtask for the .catch chain to resolve
    await Promise.resolve();

    expect(mailer.sendOrderPlacedPendingEmail).toHaveBeenCalledTimes(1);
    expect(mailer.sendOrderPlacedPendingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'buyer@example.com',
        name: 'Test Buyer',
        orderNo: 'WJK-20260526-XXXXX',
        currency: 'CNY',
        locale: 'zh-CN',
      }),
    );
  });

  it('does not fail createBuyNow when the mailer throws', async () => {
    const { prisma } = buildBuyNowPrisma();
    const mailer = buildMailer({
      sendOrderPlacedPendingEmail: vi
        .fn()
        .mockRejectedValue(new Error('SMTP down')),
    });
    const service = new OrdersService(prisma, mailer);

    await expect(service.createBuyNow(buildBuyNowDto())).resolves.toBeDefined();
    await Promise.resolve();

    expect(mailer.sendOrderPlacedPendingEmail).toHaveBeenCalledTimes(1);
  });

  it('sends pending-payment email when createCartOrder yields an UNPAID order', async () => {
    const { prisma } = buildCartPrisma();
    const mailer = buildMailer();
    const service = new OrdersService(prisma, mailer);

    await service.createCartOrder(buildCartDto());
    await Promise.resolve();

    expect(mailer.sendOrderPlacedPendingEmail).toHaveBeenCalledTimes(1);
    expect(mailer.sendOrderPlacedPendingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'WJK-20260526-CART',
        locale: 'zh-CN',
      }),
    );
  });

  it('does NOT send pending-payment email when createCartOrder yields a PAID order (PayPal capture flow)', async () => {
    const { prisma } = buildCartPrisma({ paymentStatus: 'PAID' });
    const mailer = buildMailer();
    const service = new OrdersService(prisma, mailer);

    await service.createCartOrder(
      buildCartDto({ paypalOrderId: 'PP-123', currency: 'USD' }),
    );
    await Promise.resolve();

    expect(mailer.sendOrderPlacedPendingEmail).not.toHaveBeenCalled();
  });
});

describe('OrdersService.updateOrderStatus — admin status change', () => {
  it('sends status-update email and does not surface a mailer failure', async () => {
    const updated = {
      id: 'order-1',
      orderNo: 'WJK-1',
      email: 'buyer@example.com',
      fullName: 'Test Buyer',
      locale: 'zh-CN',
      items: [],
    };
    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          status: 'CONFIRMED',
        }),
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaService;

    const mailer = buildMailer({
      sendOrderStatusUpdateEmail: vi
        .fn()
        .mockRejectedValue(new Error('mail down')),
    });
    const service = new OrdersService(prisma, mailer);

    const result = await service.updateOrderStatus('order-1', 'CANCELLED');
    await Promise.resolve();

    expect(result).toBe(updated);
    expect(mailer.sendOrderStatusUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'WJK-1',
        status: 'CANCELLED',
        locale: 'zh-CN',
      }),
    );
  });
});
