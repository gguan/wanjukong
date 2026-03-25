export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type ProductSaleType = 'IN_STOCK' | 'PREORDER';
export type ProductDisplayAvailability = 'IN_STOCK' | 'PREORDER' | 'SOLD_OUT';

export interface ProductSaleStateInput {
  productStatus: ProductStatus;
  saleType: ProductSaleType;
  preorderStartAt: Date | null;
  preorderEndAt: Date | null;
  now: Date;
}

export interface VariantPurchasabilityInput extends ProductSaleStateInput {
  variantStock: number;
}

export interface ProductDisplayAvailabilityInput extends ProductSaleStateInput {
  variantStocks: number[];
}

function isPreorderWindowActive(input: ProductSaleStateInput) {
  return Boolean(
    input.saleType === 'PREORDER' &&
      input.preorderStartAt &&
      input.preorderEndAt &&
      input.now >= input.preorderStartAt &&
      input.now <= input.preorderEndAt,
  );
}

export function deriveProductDisplayAvailability(
  input: ProductDisplayAvailabilityInput,
): ProductDisplayAvailability | null {
  if (input.productStatus !== 'ACTIVE') return null;
  if (input.variantStocks.length > 0 && input.variantStocks.every((stock) => stock === 0)) {
    return 'SOLD_OUT';
  }
  if (isPreorderWindowActive(input)) return 'PREORDER';
  if (input.saleType === 'IN_STOCK') return 'IN_STOCK';
  return null;
}

export function deriveVariantPurchasability(input: VariantPurchasabilityInput) {
  const displayAvailability = deriveProductDisplayAvailability({
    productStatus: input.productStatus,
    saleType: input.saleType,
    preorderStartAt: input.preorderStartAt,
    preorderEndAt: input.preorderEndAt,
    now: input.now,
    variantStocks: [input.variantStock],
  });

  return {
    isPurchasable:
      input.variantStock > 0 &&
      (displayAvailability === 'IN_STOCK' || displayAvailability === 'PREORDER'),
    isSoldOut: input.variantStock === 0,
  };
}
