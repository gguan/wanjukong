import { describe, expect, it } from 'vitest';
import { toPublicProductView } from './product-storefront.presenter';

describe('toPublicProductView', () => {
  it('marks a product as sold out when all variants have zero stock', () => {
    const view = toPublicProductView({
      id: 'p1',
      status: 'ACTIVE',
      saleType: 'IN_STOCK',
      preorderStartAt: null,
      preorderEndAt: null,
      variants: [
        {
          id: 'v1',
          stock: 0,
          sortOrder: 0,
          name: 'Standard',
          priceCents: 12000,
        },
      ],
    } as any);

    expect(view.displayAvailability).toBe('SOLD_OUT');
    expect(view.isPurchasable).toBe(false);
    expect(view.variants[0].isSoldOut).toBe(true);
    expect(view.variants[0].isPurchasable).toBe(false);
  });

  it('marks an in-stock variant purchasable during the preorder window', () => {
    const view = toPublicProductView(
      {
        id: 'p2',
        status: 'ACTIVE',
        saleType: 'PREORDER',
        preorderStartAt: new Date('2026-03-20T00:00:00Z'),
        preorderEndAt: new Date('2026-03-30T00:00:00Z'),
        variants: [
          {
            id: 'v1',
            stock: 3,
            sortOrder: 0,
            name: 'Standard',
            priceCents: 12000,
          },
        ],
      } as any,
      new Date('2026-03-25T12:00:00Z'),
    );

    expect(view.displayAvailability).toBe('PREORDER');
    expect(view.isPurchasable).toBe(true);
    expect(view.variants[0].isSoldOut).toBe(false);
    expect(view.variants[0].isPurchasable).toBe(true);
  });
});
