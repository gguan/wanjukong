-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('IN_STOCK', 'PREORDER');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "estimatedShipAt" TIMESTAMP(3),
ADD COLUMN     "preorderEndAt" TIMESTAMP(3),
ADD COLUMN     "preorderStartAt" TIMESTAMP(3),
ADD COLUMN     "saleType" "SaleType" NOT NULL DEFAULT 'IN_STOCK';

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "specifications" TEXT;
