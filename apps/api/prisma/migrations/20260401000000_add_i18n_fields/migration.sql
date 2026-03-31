-- Add i18n JSON fields for multi-language support
-- Each field stores: {"en":"...","zh-TW":"...","ja":"..."}
-- Original field remains the default (zh-CN)

ALTER TABLE "Brand" ADD COLUMN "nameI18n" JSONB DEFAULT '{}';

ALTER TABLE "Category" ADD COLUMN "nameI18n" JSONB DEFAULT '{}';

ALTER TABLE "Product" ADD COLUMN "nameI18n" JSONB DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "descriptionI18n" JSONB DEFAULT '{}';

ALTER TABLE "ProductVariant" ADD COLUMN "nameI18n" JSONB DEFAULT '{}';
ALTER TABLE "ProductVariant" ADD COLUMN "subtitleI18n" JSONB DEFAULT '{}';
ALTER TABLE "ProductVariant" ADD COLUMN "specSummaryI18n" JSONB DEFAULT '{}';
ALTER TABLE "ProductVariant" ADD COLUMN "specificationsI18n" JSONB DEFAULT '{}';
