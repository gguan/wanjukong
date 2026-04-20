-- Sales channel enum used for "国内 vs 国际" filtering and analytics.
-- Decoupled from currency / payment provider so future multi-currency
-- channels (PayPal CNY, Stripe, AliPay …) don't break historical reads.
CREATE TYPE "OrderChannel" AS ENUM ('WEB', 'MINIPROGRAM');

-- Order: add channel column + index. Default WEB; backfill historical
-- rows that look domestic (CNY currency or any WeChat Pay artifact).
ALTER TABLE "Order" ADD COLUMN "channel" "OrderChannel" NOT NULL DEFAULT 'WEB';

UPDATE "Order"
SET "channel" = 'MINIPROGRAM'
WHERE "currency" = 'CNY'
   OR "wechatTransactionId" IS NOT NULL
   OR "balanceWechatTransactionId" IS NOT NULL;

CREATE INDEX "Order_channel_idx" ON "Order"("channel");

-- Customer: add locale (defaults to 'en' for existing rows; WeChat users
-- get backfilled to 'zh-CN' since the miniprogram is mainland-only).
ALTER TABLE "Customer" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';

UPDATE "Customer"
SET "locale" = 'zh-CN'
WHERE "authProvider" = 'wechat';

-- Index authProvider so the admin "registered via" filter is cheap.
CREATE INDEX "Customer_authProvider_idx" ON "Customer"("authProvider");
