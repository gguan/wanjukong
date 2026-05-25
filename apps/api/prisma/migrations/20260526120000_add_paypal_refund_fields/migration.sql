-- CreateEnum
CREATE TYPE "RefundProvider" AS ENUM ('WECHAT_PAY', 'PAYPAL');

-- AlterTable PaymentIntent: persist PayPal capture id so we can refund later
ALTER TABLE "PaymentIntent" ADD COLUMN "paypalCaptureId" TEXT;

-- AlterTable Order: persist capture ids per phase (deposit / balance) so
-- refunds can target the correct capture even after the order has aged.
ALTER TABLE "Order" ADD COLUMN "paypalCaptureId" TEXT;
ALTER TABLE "Order" ADD COLUMN "balancePaypalCaptureId" TEXT;

-- AlterTable Refund: provider discrimination + PayPal-specific IDs.
-- Pre-existing rows are all WeChat (the only path that was wired), so we
-- backfill the discriminator to WECHAT_PAY before applying the default.
ALTER TABLE "Refund" ADD COLUMN "provider" "RefundProvider" NOT NULL DEFAULT 'WECHAT_PAY';
ALTER TABLE "Refund" ADD COLUMN "paypalCaptureId" TEXT;
ALTER TABLE "Refund" ADD COLUMN "paypalRefundId" TEXT;
ALTER TABLE "Refund" ADD COLUMN "outRefundNo" TEXT;

-- Backfill outRefundNo from wechatRefundNo so existing refunds retain their
-- caller-side idempotency key under the unified column.
UPDATE "Refund" SET "outRefundNo" = "wechatRefundNo" WHERE "outRefundNo" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Refund_paypalRefundId_key" ON "Refund"("paypalRefundId");
CREATE UNIQUE INDEX "Refund_outRefundNo_key" ON "Refund"("outRefundNo");
CREATE INDEX "Refund_provider_idx" ON "Refund"("provider");
