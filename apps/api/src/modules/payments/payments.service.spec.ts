import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service';
import { PayPalRefundError } from './providers/paypal.provider';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OrdersService } from '../orders/orders.service';
import type { MailerService } from '../mailer/mailer.service';
import type { PaypalProvider } from './providers/paypal.provider';
import type { WechatPayProvider } from './providers/wechat-pay.provider';

/**
 * Unit tests for the PayPal refund path of PaymentsService.refundOrder.
 *
 * Parity goal with the WeChat path: cover success, partial, duplicate,
 * over-refund, and network failure. The PayPal provider client is mocked
 * end-to-end — these tests assert the orchestration that lives in the
 * service: amount validation, capture-id routing, Refund row state, order
 * payment status, stock restoration, and coupon release.
 */

type RefundRow = {
  id: string;
  orderId: string;
  amountCents: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  provider: 'WECHAT_PAY' | 'PAYPAL';
  paypalCaptureId: string | null;
  paypalRefundId: string | null;
  outRefundNo: string | null;
  processedAt: Date | null;
  reason: string | null;
};

interface OrderRow {
  id: string;
  totalPriceCents: number;
  paymentStatus: 'PAID' | 'REFUNDED' | 'UNPAID' | 'DEPOSIT_PAID' | 'FAILED';
  currency: string;
  depositCents: number;
  balanceCents: number;
  paypalCaptureId: string | null;
  balancePaypalCaptureId: string | null;
  wechatTransactionId: string | null;
  couponCode: string | null;
  items: Array<{ variantId: string | null; quantity: number }>;
}

function makeOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    totalPriceCents: 10_000,
    paymentStatus: 'PAID',
    currency: 'USD',
    depositCents: 10_000,
    balanceCents: 0,
    paypalCaptureId: 'CAPTURE-DEPOSIT-1',
    balancePaypalCaptureId: null,
    wechatTransactionId: null,
    couponCode: null,
    items: [{ variantId: 'variant-1', quantity: 1 }],
    ...overrides,
  };
}

function buildHarness(opts: {
  order: OrderRow;
  initialRefunds?: RefundRow[];
  paypalRefund?: PaypalProvider['refundCapture'];
}) {
  const order: OrderRow = { ...opts.order };
  const refunds: RefundRow[] = (opts.initialRefunds ?? []).map((r) => ({ ...r }));
  let refundCounter = refunds.length;

  const prisma = {
    order: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: { items?: boolean; refunds?: boolean } }) => {
        if (where.id !== order.id) return null;
        return {
          ...order,
          ...(include?.items ? { items: order.items } : {}),
          ...(include?.refunds ? { refunds } : {}),
        };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<OrderRow> }) => {
        if (where.id !== order.id) return null;
        Object.assign(order, data);
        return order;
      }),
    },
    refund: {
      create: vi.fn(async ({ data }: { data: Partial<RefundRow> }) => {
        refundCounter += 1;
        const row: RefundRow = {
          id: `refund-${refundCounter}`,
          orderId: data.orderId!,
          amountCents: data.amountCents!,
          status: (data.status as RefundRow['status']) ?? 'PENDING',
          provider: (data.provider as RefundRow['provider']) ?? 'PAYPAL',
          paypalCaptureId: data.paypalCaptureId ?? null,
          paypalRefundId: data.paypalRefundId ?? null,
          outRefundNo: data.outRefundNo ?? null,
          processedAt: data.processedAt ?? null,
          reason: data.reason ?? null,
        };
        refunds.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<RefundRow> }) => {
        const row = refunds.find((r) => r.id === where.id);
        if (!row) throw new Error(`refund not found: ${where.id}`);
        Object.assign(row, data);
        return row;
      }),
    },
    productVariant: {
      update: vi.fn(async () => ({})),
    },
  } as unknown as PrismaService;

  const ordersService = {
    releaseCoupon: vi.fn(async () => undefined),
  } as unknown as OrdersService;

  const mailerService = {} as unknown as MailerService;

  const paypalProvider = {
    refundCapture: opts.paypalRefund ?? vi.fn(async (params: { captureId: string; outRefundNo: string; refundCents?: number }) => ({
      status: 'SUCCESS' as const,
      refundId: `PP-RFND-${params.outRefundNo}`,
      rawStatus: 'COMPLETED',
      refundedCents: params.refundCents,
    })),
  } as unknown as PaypalProvider;

  const wechatPayProvider = {
    refundOrder: vi.fn(),
  } as unknown as WechatPayProvider;

  const service = new PaymentsService(
    prisma,
    ordersService,
    mailerService,
    paypalProvider,
    wechatPayProvider,
  );

  return { service, prisma, ordersService, paypalProvider, refunds, order };
}

describe('PaymentsService.refundOrder (PayPal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full refund: marks order REFUNDED, restores stock, releases coupon', async () => {
    const harness = buildHarness({
      order: makeOrder({ couponCode: 'SAVE10', items: [{ variantId: 'variant-1', quantity: 2 }] }),
    });

    const refund = await harness.service.refundOrder('order-1', 10_000, 'customer request', 'admin-1');

    expect(refund.status).toBe('SUCCESS');
    expect(refund.provider).toBe('PAYPAL');
    expect(refund.paypalCaptureId).toBe('CAPTURE-DEPOSIT-1');
    expect(refund.paypalRefundId).toMatch(/^PP-RFND-RF-/);
    expect(refund.outRefundNo).toMatch(/^RF-/);
    expect(harness.paypalProvider.refundCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        captureId: 'CAPTURE-DEPOSIT-1',
        refundCents: 10_000,
        currency: 'USD',
      }),
    );
    expect(harness.order.paymentStatus).toBe('REFUNDED');
    expect(harness.prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: { stock: { increment: 2 } },
    });
    expect(harness.ordersService.releaseCoupon).toHaveBeenCalledWith('SAVE10');
  });

  it('partial refund: keeps order PAID and leaves coupon reserved', async () => {
    const harness = buildHarness({ order: makeOrder({ couponCode: 'SAVE10' }) });

    const refund = await harness.service.refundOrder('order-1', 3_000, 'partial fix', 'admin-1');

    expect(refund.amountCents).toBe(3_000);
    expect(refund.status).toBe('SUCCESS');
    expect(harness.order.paymentStatus).toBe('PAID');
    expect(harness.prisma.productVariant.update).not.toHaveBeenCalled();
    expect(harness.ordersService.releaseCoupon).not.toHaveBeenCalled();
  });

  it('duplicate refund: rejects when prior PENDING refund covers the same amount', async () => {
    const harness = buildHarness({
      order: makeOrder(),
      initialRefunds: [
        {
          id: 'refund-existing',
          orderId: 'order-1',
          amountCents: 10_000,
          status: 'PENDING',
          provider: 'PAYPAL',
          paypalCaptureId: 'CAPTURE-DEPOSIT-1',
          paypalRefundId: null,
          outRefundNo: 'RF-EXISTING',
          processedAt: null,
          reason: null,
        },
      ],
    });

    await expect(
      harness.service.refundOrder('order-1', 1, 'retry', 'admin-1'),
    ).rejects.toThrow(BadRequestException);
    expect(harness.paypalProvider.refundCapture).not.toHaveBeenCalled();
  });

  it('over-refund: rejects when amount exceeds remaining refundable balance', async () => {
    const harness = buildHarness({
      order: makeOrder(),
      initialRefunds: [
        {
          id: 'refund-existing',
          orderId: 'order-1',
          amountCents: 6_000,
          status: 'SUCCESS',
          provider: 'PAYPAL',
          paypalCaptureId: 'CAPTURE-DEPOSIT-1',
          paypalRefundId: 'PP-OLD',
          outRefundNo: 'RF-OLD',
          processedAt: new Date(),
          reason: null,
        },
      ],
    });

    await expect(
      harness.service.refundOrder('order-1', 5_000, 'overshoot', 'admin-1'),
    ).rejects.toThrow(/最多可退 \$40\.00/);
    expect(harness.paypalProvider.refundCapture).not.toHaveBeenCalled();
  });

  it('network failure: Refund row persists as FAILED and order stays PAID', async () => {
    const harness = buildHarness({
      order: makeOrder(),
      paypalRefund: vi.fn(async () => {
        throw new PayPalRefundError('PROVIDER_TIMEOUT', 'PayPal refund timed out');
      }) as unknown as PaypalProvider['refundCapture'],
    });

    await expect(
      harness.service.refundOrder('order-1', 10_000, 'customer request', 'admin-1'),
    ).rejects.toThrow(/PROVIDER_TIMEOUT/);

    expect(harness.refunds).toHaveLength(1);
    expect(harness.refunds[0]).toMatchObject({
      provider: 'PAYPAL',
      status: 'FAILED',
      amountCents: 10_000,
    });
    expect(harness.order.paymentStatus).toBe('PAID');
  });

  it('already-fully-refunded: treats CAPTURE_FULLY_REFUNDED as SUCCESS (idempotent retry)', async () => {
    const harness = buildHarness({
      order: makeOrder(),
      paypalRefund: vi.fn(async () => {
        throw new PayPalRefundError(
          'CAPTURE_FULLY_REFUNDED',
          'Capture is already fully refunded',
        );
      }) as unknown as PaypalProvider['refundCapture'],
    });

    await expect(
      harness.service.refundOrder('order-1', 10_000, 'retry', 'admin-1'),
    ).rejects.toThrow(BadRequestException);

    // Refund row reconciled to SUCCESS even though the call threw, so a
    // subsequent reconciliation pass won't try to refund again.
    expect(harness.refunds[0].status).toBe('SUCCESS');
  });

  it('preorder: splits refund across balance and deposit captures, balance first', async () => {
    const harness = buildHarness({
      order: makeOrder({
        totalPriceCents: 30_000,
        depositCents: 10_000,
        balanceCents: 20_000,
        balancePaypalCaptureId: 'CAPTURE-BALANCE-1',
      }),
    });

    const refund = await harness.service.refundOrder('order-1', 25_000, 'full refund', 'admin-1');

    const captureCalls = (harness.paypalProvider.refundCapture as ReturnType<typeof vi.fn>).mock.calls;
    expect(captureCalls).toHaveLength(2);
    expect(captureCalls[0][0]).toMatchObject({
      captureId: 'CAPTURE-BALANCE-1',
      refundCents: 20_000,
    });
    expect(captureCalls[1][0]).toMatchObject({
      captureId: 'CAPTURE-DEPOSIT-1',
      refundCents: 5_000,
    });
    expect(refund.status).toBe('SUCCESS');
  });

  it('missing capture id: refuses to call PayPal', async () => {
    const harness = buildHarness({
      order: makeOrder({ paypalCaptureId: null }),
    });

    await expect(
      harness.service.refundOrder('order-1', 10_000, 'customer request', 'admin-1'),
    ).rejects.toThrow(/missing PayPal capture/i);
    expect(harness.paypalProvider.refundCapture).not.toHaveBeenCalled();
  });
});
