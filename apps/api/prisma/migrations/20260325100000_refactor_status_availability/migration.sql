-- Refactor: separate product visibility (ProductStatus) from selling availability (AvailabilityType)
-- ProductStatus: DRAFT, ACTIVE, INACTIVE (removed SOLD_OUT)
-- AvailabilityType: IN_STOCK, PREORDER, SOLD_OUT (new), COMING_SOON (new)

-- Add new availability values
ALTER TYPE "AvailabilityType" ADD VALUE IF NOT EXISTS 'SOLD_OUT';
ALTER TYPE "AvailabilityType" ADD VALUE IF NOT EXISTS 'COMING_SOON';

-- Data migration: SOLD_OUT status -> ACTIVE status + SOLD_OUT availability
-- (must run after enum values are committed)
