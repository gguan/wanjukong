-- Add WECHAT_PAY to PaymentProvider enum
ALTER TYPE "PaymentProvider" ADD VALUE 'WECHAT_PAY';

-- Add WeChat Pay fields to PaymentIntent
ALTER TABLE "PaymentIntent"
  ADD COLUMN "wechatPrepayId"      TEXT,
  ADD COLUMN "wechatOutTradeNo"    TEXT,
  ADD COLUMN "wechatTransactionId" TEXT;

CREATE UNIQUE INDEX "PaymentIntent_wechatOutTradeNo_key"
  ON "PaymentIntent"("wechatOutTradeNo");

CREATE INDEX "PaymentIntent_wechatOutTradeNo_idx"
  ON "PaymentIntent"("wechatOutTradeNo");

-- Add wechatTransactionId to Order
ALTER TABLE "Order"
  ADD COLUMN "wechatTransactionId" TEXT;

-- Add WeChat fields to Customer
ALTER TABLE "Customer"
  ADD COLUMN "wechatOpenId"  TEXT,
  ADD COLUMN "authProvider"  TEXT NOT NULL DEFAULT 'email';

CREATE UNIQUE INDEX "Customer_wechatOpenId_key"
  ON "Customer"("wechatOpenId");
