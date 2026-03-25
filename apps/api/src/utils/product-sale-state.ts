export type ProductDisplayAvailability = 'IN_STOCK' | 'PREORDER' | 'SOLD_OUT';

export interface ProductDisplayAvailabilityInput {
  productStatus: string;
  saleType: string;
  preorderStartAt: Date | null;
  preorderEndAt: Date | null;
  now: Date;
  variantStocks: number[];
}

export interface VariantPurchasabilityInput {
  productStatus: string;
  saleType: string;
  preorderStartAt: Date | null;
  preorderEndAt: Date | null;
  now: Date;
  variantStock: number;
}

function isPreorderWindowActive(input: {
  saleType: string;
  preorderStartAt: Date | null;
  preorderEndAt: Date | null;
  now: Date;
}) {
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
  if (
    input.variantStocks.length > 0 &&
    input.variantStocks.every((stock) => stock === 0)
  ) {
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
      (displayAvailability === 'IN_STOCK' ||
        displayAvailability === 'PREORDER'),
    isSoldOut: input.variantStock === 0,
  };
}
