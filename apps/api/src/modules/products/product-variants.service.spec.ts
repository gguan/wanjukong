import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from './products.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService.create', () => {
  it('creates the product and default variant in one transaction', async () => {
    const tx = {
      product: {
        create: vi.fn().mockResolvedValue({
          id: 'product-1',
          name: 'Raiden',
          slug: 'raiden',
        }),
      },
      productVariant: {
        create: vi.fn().mockResolvedValue({
          id: 'variant-1',
        }),
      },
    };

    const prisma = {
      brand: {
        findUnique: vi.fn().mockResolvedValue({ id: 'brand-1', name: 'TestBrand', code: 'TB' }),
      },
      productVariant: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService;

    const service = new ProductsService(prisma);

    await service.create({
      name: 'Raiden',
      slug: 'raiden',
      brandId: 'brand-1',
      categoryId: 'category-1',
      saleType: 'IN_STOCK',
      defaultVariant: {
        name: 'Standard',
        sku: 'raiden-std',
        priceCents: 12999,
        stock: 5,
      },
    } as never);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.create).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-1',
        name: 'Standard',
        sku: 'RAIDEN-STD',
        priceCents: 12999,
        stock: 5,
        isDefault: true,
        sortOrder: 0,
      }),
    });
  });
});
