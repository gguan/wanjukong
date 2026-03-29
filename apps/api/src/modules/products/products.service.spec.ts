import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from './products.service';
import type { PrismaService } from '../../prisma/prisma.service';

function makePrisma(products: unknown[], total = 0) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(products),
      count: vi.fn().mockResolvedValue(total ?? (products as unknown[]).length),
    },
  } as unknown as PrismaService;
}

describe('ProductsService.findAllActive', () => {
  it('applies name search filter', async () => {
    const prisma = makePrisma([], 0);
    const service = new ProductsService(prisma);

    await service.findAllActive({ search: 'batman' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'batman', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('applies pagination with default page=1 limit=20', async () => {
    const prisma = makePrisma([], 0);
    const service = new ProductsService(prisma);

    await service.findAllActive({});

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('computes correct skip for page 3', async () => {
    const prisma = makePrisma([], 0);
    const service = new ProductsService(prisma);

    await service.findAllActive({ page: 3, limit: 10 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('returns paginated shape', async () => {
    const prisma = makePrisma([{ id: '1', variants: [], status: 'ACTIVE', saleType: 'IN_STOCK', preorderStartAt: null, preorderEndAt: null }], 1);
    const service = new ProductsService(prisma);

    const result = await service.findAllActive({ page: 1, limit: 20 });

    expect(result).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('caps limit at 100', async () => {
    const prisma = makePrisma([], 0);
    const service = new ProductsService(prisma);

    await service.findAllActive({ limit: 999 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});

describe('ProductsService.findAll (admin)', () => {
  it('applies status filter', async () => {
    const prisma = makePrisma([], 0);
    const service = new ProductsService(prisma);

    await service.findAll(undefined, { status: 'DRAFT' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      }),
    );
  });

  it('filters by allowed brand IDs', async () => {
    const prisma = makePrisma([], 0);
    const service = new ProductsService(prisma);

    await service.findAll(['brand-1', 'brand-2']);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ brandId: { in: ['brand-1', 'brand-2'] } }),
      }),
    );
  });
});
