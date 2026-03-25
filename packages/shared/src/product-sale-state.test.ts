import { describe, expect, it } from 'vitest';
import {
  deriveProductDisplayAvailability,
  deriveVariantPurchasability,
} from './product-sale-state';

describe('deriveProductDisplayAvailability', () => {
  it('returns SOLD_OUT when all variants are out of stock', () => {
    expect(
      deriveProductDisplayAvailability({
        productStatus: 'ACTIVE',
        saleType: 'IN_STOCK',
        preorderStartAt: null,
        preorderEndAt: null,
        now: new Date('2026-03-25T12:00:00Z'),
        variantStocks: [0, 0],
      }),
    ).toBe('SOLD_OUT');
  });

  it('returns PREORDER only inside the preorder window', () => {
    expect(
      deriveProductDisplayAvailability({
        productStatus: 'ACTIVE',
        saleType: 'PREORDER',
        preorderStartAt: new Date('2026-03-20T00:00:00Z'),
        preorderEndAt: new Date('2026-03-30T00:00:00Z'),
        now: new Date('2026-03-25T12:00:00Z'),
        variantStocks: [5],
      }),
    ).toBe('PREORDER');
  });

  it('returns null before preorder starts', () => {
    expect(
      deriveProductDisplayAvailability({
        productStatus: 'ACTIVE',
        saleType: 'PREORDER',
        preorderStartAt: new Date('2026-03-26T00:00:00Z'),
        preorderEndAt: new Date('2026-03-30T00:00:00Z'),
        now: new Date('2026-03-25T12:00:00Z'),
        variantStocks: [5],
      }),
    ).toBeNull();
  });
});

describe('deriveVariantPurchasability', () => {
  it('keeps zero-stock variants visible but not purchasable', () => {
    expect(
      deriveVariantPurchasability({
        productStatus: 'ACTIVE',
        saleType: 'IN_STOCK',
        preorderStartAt: null,
        preorderEndAt: null,
        now: new Date('2026-03-25T12:00:00Z'),
        variantStock: 0,
      }),
    ).toEqual({ isPurchasable: false, isSoldOut: true });
  });

  it('allows in-stock variants when the product is in stock', () => {
    expect(
      deriveVariantPurchasability({
        productStatus: 'ACTIVE',
        saleType: 'IN_STOCK',
        preorderStartAt: null,
        preorderEndAt: null,
        now: new Date('2026-03-25T12:00:00Z'),
        variantStock: 3,
      }),
    ).toEqual({ isPurchasable: true, isSoldOut: false });
  });
});
