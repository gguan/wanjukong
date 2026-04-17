-- Normalize image URLs to object keys across all image-storing tables.
-- Strips the Tencent COS public base URL so only the object key remains.
-- Safe to re-run: already-normalized keys are left unchanged.

-- Product.imageUrl
UPDATE "Product"
SET "imageUrl" = regexp_replace("imageUrl", '^https?://[^/]+/', '')
WHERE "imageUrl" LIKE 'http%://%';

-- ProductImage.imageUrl
UPDATE "ProductImage"
SET "imageUrl" = regexp_replace("imageUrl", '^https?://[^/]+/', '')
WHERE "imageUrl" LIKE 'http%://%';

-- ProductVariant.coverImageUrl
UPDATE "ProductVariant"
SET "coverImageUrl" = regexp_replace("coverImageUrl", '^https?://[^/]+/', '')
WHERE "coverImageUrl" LIKE 'http%://%';

-- Brand.logo
UPDATE "Brand"
SET "logo" = regexp_replace("logo", '^https?://[^/]+/', '')
WHERE "logo" LIKE 'http%://%';

-- OrderItem.coverImageUrlSnapshot (historical snapshots)
UPDATE "OrderItem"
SET "coverImageUrlSnapshot" = regexp_replace("coverImageUrlSnapshot", '^https?://[^/]+/', '')
WHERE "coverImageUrlSnapshot" LIKE 'http%://%';

-- UploadFile.fileUrl (tracking table)
UPDATE "UploadFile"
SET "fileUrl" = regexp_replace("fileUrl", '^https?://[^/]+/', '')
WHERE "fileUrl" LIKE 'http%://%';
