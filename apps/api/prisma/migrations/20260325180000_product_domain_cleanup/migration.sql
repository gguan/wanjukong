DROP INDEX IF EXISTS "ProductVariant_productId_status_idx";

ALTER TABLE "Product"
DROP COLUMN "price",
DROP COLUMN "stock",
DROP COLUMN "availability";

ALTER TABLE "ProductVariant"
DROP COLUMN "availabilityType",
DROP COLUMN "status",
DROP COLUMN "estimatedShipAt";

CREATE UNIQUE INDEX "ProductVariant_one_default_per_product"
ON "ProductVariant" ("productId")
WHERE "isDefault" = true;

CREATE UNIQUE INDEX "ProductImage_one_primary_per_product"
ON "ProductImage" ("productId")
WHERE "isPrimary" = true;

DROP TYPE "AvailabilityType";
