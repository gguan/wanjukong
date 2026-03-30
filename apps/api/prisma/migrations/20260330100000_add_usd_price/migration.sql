-- Add USD price to ProductVariant (optional, in cents)
ALTER TABLE "ProductVariant"
  ADD COLUMN "usdPriceCents" INTEGER;
