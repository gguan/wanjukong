-- PayPal refund support: persist the capture id needed by PayPal's
-- refund-captured-payment endpoint, plus reconciliation columns on Refund.

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "paypalCaptureId" TEXT;
ALTER TABLE "Order" ADD COLUMN "balancePaypalCaptureId" TEXT;

-- AlterTable Refund
ALTER TABLE "Refund" ADD COLUMN "paypalRefundId" TEXT;
ALTER TABLE "Refund" ADD COLUMN "paypalRefundNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Refund_paypalRefundNo_key" ON "Refund"("paypalRefundNo");
