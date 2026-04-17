-- Add deposit/balance support for Sideshow-style preorder payment

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'DEPOSIT_PAID' BEFORE 'PAID';

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "usdDepositCents" INTEGER;

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "isPreorder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "depositCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "balanceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "depositPaidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "balancePaidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "balanceDueBy" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "balancePaypalOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN "balanceWechatTransactionId" TEXT;

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "isPreorder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "depositCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable PaymentIntent
ALTER TABLE "PaymentIntent" ADD COLUMN "isBalance" BOOLEAN NOT NULL DEFAULT false;
