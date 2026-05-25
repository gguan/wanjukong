import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OrdersService } from '../orders/orders.service';
import type { MailerService } from '../mailer/mailer.service';
import type { PaypalProvider } from './providers/paypal.provider';
import type { WechatPayProvider } from './providers/wechat-pay.provider';

const mailer = {} as unknown as MailerService;

function makeService(overrides: {
  prisma?: Partial<PrismaService>;
  paypal?: Partial<PaypalProvider>;
  wechat?: Partial<WechatPayProvider>;
  orders?: Partial<OrdersService>;
}) {
  return new PaymentsService(
    (overrides.prisma ?? {}) as PrismaService,
    (overrides.orders ?? {}) as OrdersService,
    mailer,
    (overrides.paypal ?? {}) as PaypalProvider,
    (overrides.wechat ?? {}) as WechatPayProvider,
  );
}

describe('PaymentsService.refundOrder — PayPal dispatch', () => {
  it('routes USD orders through PayPal and persists the refund row + flips order to REFUNDED on full refund', async () => {
    const refundCreate = vi.fn().mockResolvedValue({ id: 'refund-1' });
    const orderUpdate = vi.fn().mockResolvedValue({});
    const variantUpdate = vi.fn().mockResolvedValue({});
    const releaseCoupon = vi.fn().mockResolvedValue(undefined);
    const refundCapture = vi
      .fn()
      .mockResolvedValue({ refundId: 'pp-refund-9', status: 'SUCCESS' });

    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-1',
          paymentStatus: 'PAID',
          totalPriceCents: 1000,
          currency: 'USD',
          paypalCaptureId: 'CAP-1',
          wechatTransactionId: null,
          couponCode: 'WELCOME',
          refunds: [],
          items: [{ variantId: 'v1', quantity: 2 }],
        }),
        update: orderUpdate,
      },
      refund: { create: refundCreate },
      productVariant: { update: variantUpdate },
    } as unknown as PrismaService;

    const service = makeService({
      prisma,
      paypal: { refundCapture } as unknown as PaypalProvider,
      orders: { releaseCoupon } as unknown as OrdersService,
    });

    const refund = await service.refundOrder('order-1', 1000, 'test', 'admin-1');

    expect(refundCapture).toHaveBeenCalledTimes(1);
    expect(refundCapture.mock.calls[0][0]).toMatchObject({
      captureId: 'CAP-1',
      refundCents: 1000,
      currency: 'USD',
    });

    expect(refundCreate).toHaveBeenCalledTimes(1);
    const data = refundCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      orderId: 'order-1',
      amountCents: 1000,
      status: 'SUCCESS',
      paypalRefundId: 'pp-refund-9',
    });
    expect(data.paypalRefundNo).toMatch(/^RF-/);

    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { paymentStatus: 'REFUNDED' },
    });
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { increment: 2 } },
    });
    expect(releaseCoupon).toHaveBeenCalledWith('WELCOME');
    expect(refund).toEqual({ id: 'refund-1' });
  });

  it('does NOT flip to REFUNDED on a partial refund', async () => {
    const refundCreate = vi.fn().mockResolvedValue({ id: 'refund-2' });
    const orderUpdate = vi.fn();
    const variantUpdate = vi.fn();

    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-2',
          paymentStatus: 'PAID',
          totalPriceCents: 1000,
          currency: 'USD',
          paypalCaptureId: 'CAP-2',
          wechatTransactionId: null,
          couponCode: null,
          refunds: [],
          items: [{ variantId: 'v1', quantity: 1 }],
        }),
        update: orderUpdate,
      },
      refund: { create: refundCreate },
      productVariant: { update: variantUpdate },
    } as unknown as PrismaService;

    const service = makeService({
      prisma,
      paypal: {
        refundCapture: vi
          .fn()
          .mockResolvedValue({ refundId: 'pp-r', status: 'SUCCESS' }),
      } as unknown as PaypalProvider,
    });

    await service.refundOrder('order-2', 400, undefined, 'admin');

    expect(orderUpdate).not.toHaveBeenCalled();
    expect(variantUpdate).not.toHaveBeenCalled();
  });

  it('rejects refund when order has no capture id and no WeChat txn', async () => {
    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-3',
          paymentStatus: 'PAID',
          totalPriceCents: 1000,
          currency: 'USD',
          paypalCaptureId: null,
          wechatTransactionId: null,
          refunds: [],
          items: [],
        }),
      },
    } as unknown as PrismaService;

    const service = makeService({ prisma });

    await expect(
      service.refundOrder('order-3', 1000, undefined, 'admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when order does not exist', async () => {
    const prisma = {
      order: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const service = makeService({ prisma });

    await expect(
      service.refundOrder('missing', 100, undefined, 'admin'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an over-refund', async () => {
    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'order-4',
          paymentStatus: 'PAID',
          totalPriceCents: 500,
          currency: 'USD',
          paypalCaptureId: 'CAP-4',
          refunds: [{ status: 'SUCCESS', amountCents: 300 }],
          items: [],
        }),
      },
    } as unknown as PrismaService;

    const service = makeService({ prisma });

    await expect(
      service.refundOrder('order-4', 300, undefined, 'admin'),
    ).rejects.toThrow(/最多可退/);
  });
});
