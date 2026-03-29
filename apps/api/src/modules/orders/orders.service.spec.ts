import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OrdersService } from './orders.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MailerService } from '../mailer/mailer.service';
import type { CreateBuyNowOrderDto } from './dto/create-buy-now-order.dto';

const mockMailer = {
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
} as unknown as MailerService;

describe('OrdersService.createBuyNow', () => {
  it('rejects preorder purchases outside the preorder window', async () => {
    const tx = {
      productVariant: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        create: vi.fn().mockResolvedValue({ id: 'order-1', items: [] }),
      },
    };

    const prisma = {
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'product-1',
          name: 'Raiden',
          slug: 'raiden',
          status: 'ACTIVE',
          saleType: 'PREORDER',
          preorderStartAt: new Date('2026-04-01T00:00:00Z'),
          preorderEndAt: new Date('2026-04-10T00:00:00Z'),
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
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService;

    const service = new OrdersService(prisma, mockMailer);

    await expect(
      service.createBuyNow({
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 1,
        fullName: 'Test Buyer',
        email: 'buyer@example.com',
        country: 'US',
        city: 'Shanghai',
        addressLine1: 'Road 1',
      } as CreateBuyNowOrderDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses guarded variant stock updates for in-stock purchases', async () => {
    const tx = {
      productVariant: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        create: vi.fn().mockResolvedValue({ id: 'order-1', items: [] }),
      },
    };

    const prisma = {
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
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService;

    const service = new OrdersService(prisma, mockMailer);

    await service.createBuyNow({
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 2,
      fullName: 'Test Buyer',
      email: 'buyer@example.com',
      country: 'US',
      city: 'Shanghai',
      addressLine1: 'Road 1',
    } as CreateBuyNowOrderDto);

    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'variant-1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });
});
