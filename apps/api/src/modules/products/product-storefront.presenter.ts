import {
  deriveProductDisplayAvailability,
  deriveVariantPurchasability,
} from '@wanjukong/shared';

export function toPublicProductView<T extends { variants?: Array<{ stock: number }> }>(
  product: T & {
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
    saleType: 'IN_STOCK' | 'PREORDER';
    preorderStartAt: Date | null;
    preorderEndAt: Date | null;
    variants: Array<T['variants'] extends Array<infer U> ? U : { stock: number }>;
  },
  now = new Date(),
) {
  const variantStocks = product.variants.map((variant) => variant.stock);
  const displayAvailability = deriveProductDisplayAvailability({
    productStatus: product.status,
    saleType: product.saleType,
    preorderStartAt: product.preorderStartAt,
    preorderEndAt: product.preorderEndAt,
    now,
    variantStocks,
  });
  const isPurchasable =
    displayAvailability === 'IN_STOCK' || displayAvailability === 'PREORDER';

  return {
    ...product,
    displayAvailability,
    isPurchasable,
    variants: product.variants.map((variant) => ({
      ...variant,
      ...deriveVariantPurchasability({
        productStatus: product.status,
        saleType: product.saleType,
        preorderStartAt: product.preorderStartAt,
        preorderEndAt: product.preorderEndAt,
        now,
        variantStock: variant.stock,
      }),
    })),
  };
}
