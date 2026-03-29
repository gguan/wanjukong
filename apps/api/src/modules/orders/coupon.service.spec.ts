import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OrdersService } from './orders.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MailerService } from '../mailer/mailer.service';

const mockMailer = {
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
} as unknown as MailerService;

function makeCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id: 'coupon-1',
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderCents: 0,
    maxUsageTimes: null,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    ...overrides,
  };
}

function makePrisma(coupon: unknown) {
  return {
    coupon: {
      findUnique: vi.fn().mockResolvedValue(coupon),
    },
  } as unknown as PrismaService;
}

describe('OrdersService.validateCoupon', () => {
  it('throws when coupon not found', async () => {
    const prisma = makePrisma(null);
    const service = new OrdersService(prisma, mockMailer);
    await expect(service.validateCoupon('NOPE', 10000)).rejects.toThrow(BadRequestException);
  });

  it('throws when coupon is inactive', async () => {
    const prisma = makePrisma(makeCoupon({ isActive: false }));
    const service = new OrdersService(prisma, mockMailer);
    await expect(service.validateCoupon('SAVE10', 10000)).rejects.toThrow(BadRequestException);
  });

  it('throws when coupon is expired', async () => {
    const prisma = makePrisma(makeCoupon({ expiresAt: new Date('2020-01-01') }));
    const service = new OrdersService(prisma, mockMailer);
    await expect(service.validateCoupon('SAVE10', 10000)).rejects.toThrow(BadRequestException);
  });

  it('throws when usage limit reached', async () => {
    const prisma = makePrisma(makeCoupon({ maxUsageTimes: 5, usedCount: 5 }));
    const service = new OrdersService(prisma, mockMailer);
    await expect(service.validateCoupon('SAVE10', 10000)).rejects.toThrow(BadRequestException);
  });

  it('throws when order is below minimum', async () => {
    const prisma = makePrisma(makeCoupon({ minOrderCents: 5000 }));
    const service = new OrdersService(prisma, mockMailer);
    await expect(service.validateCoupon('SAVE10', 3000)).rejects.toThrow(BadRequestException);
  });

  it('computes 10% discount on $100 order', async () => {
    const prisma = makePrisma(makeCoupon());
    const service = new OrdersService(prisma, mockMailer);
    const result = await service.validateCoupon('SAVE10', 10000);
    expect(result.discountCents).toBe(1000);
  });

  it('computes fixed $5 discount', async () => {
    const prisma = makePrisma(makeCoupon({ discountType: 'FIXED', discountValue: 500 }));
    const service = new OrdersService(prisma, mockMailer);
    const result = await service.validateCoupon('SAVE5', 10000);
    expect(result.discountCents).toBe(500);
  });

  it('caps fixed discount at order total', async () => {
    const prisma = makePrisma(makeCoupon({ discountType: 'FIXED', discountValue: 99999 }));
    const service = new OrdersService(prisma, mockMailer);
    const result = await service.validateCoupon('BIG', 5000);
    expect(result.discountCents).toBe(5000);
  });
});
