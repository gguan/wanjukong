-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN "discountCents" INTEGER;
