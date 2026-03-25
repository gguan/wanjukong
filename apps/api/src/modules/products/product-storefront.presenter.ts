import {
  deriveProductDisplayAvailability,
  deriveVariantPurchasability,
} from '../../utils/product-sale-state';

type StorefrontVariant = { stock: number };

type StorefrontProduct<TVariant extends StorefrontVariant> = {
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  saleType: 'IN_STOCK' | 'PREORDER';
  preorderStartAt: Date | null;
  preorderEndAt: Date | null;
  variants: TVariant[];
};

export function toPublicProductView<
  TVariant extends StorefrontVariant,
  TProduct extends StorefrontProduct<TVariant>,
>(
  product: TProduct,
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
