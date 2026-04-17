import {
  deriveProductDisplayAvailability,
  deriveVariantPurchasability,
} from '../../utils/product-sale-state';
import { toPublicUrl } from '../../utils/image-url';

type StorefrontVariant = { stock: number; coverImageUrl?: string | null };

type StorefrontBrand = { logo?: string | null; [k: string]: unknown };

type StorefrontProduct<TVariant extends StorefrontVariant> = {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE';
  saleType: 'IN_STOCK' | 'PREORDER';
  preorderStartAt: Date | null;
  preorderEndAt: Date | null;
  imageUrl?: string | null;
  brand?: StorefrontBrand | null;
  variants: TVariant[];
  images?: Array<{ imageUrl: string; [k: string]: unknown }>;
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
    imageUrl: toPublicUrl(product.imageUrl),
    displayAvailability,
    isPurchasable,
    ...(product.brand
      ? {
          brand: {
            ...product.brand,
            logo: toPublicUrl((product.brand.logo as string | null | undefined) ?? null),
          },
        }
      : {}),
    variants: product.variants.map((variant) => ({
      ...variant,
      coverImageUrl: toPublicUrl(variant.coverImageUrl),
      ...deriveVariantPurchasability({
        productStatus: product.status,
        saleType: product.saleType,
        preorderStartAt: product.preorderStartAt,
        preorderEndAt: product.preorderEndAt,
        now,
        variantStock: variant.stock,
      }),
    })),
    ...(product.images
      ? {
          images: product.images.map((img) => ({
            ...img,
            imageUrl: toPublicUrl(img.imageUrl),
          })),
        }
      : {}),
  };
}
