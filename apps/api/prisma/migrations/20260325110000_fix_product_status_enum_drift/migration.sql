DO $$
DECLARE
    has_sold_out boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'ProductStatus'
          AND e.enumlabel = 'SOLD_OUT'
    )
    INTO has_sold_out;

    IF has_sold_out THEN
        ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
        CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

        ALTER TABLE "Product"
            ALTER COLUMN "status" DROP DEFAULT,
            ALTER COLUMN "status" TYPE "ProductStatus"
            USING ("status"::text::"ProductStatus");

        ALTER TABLE "ProductVariant"
            ALTER COLUMN "status" DROP DEFAULT,
            ALTER COLUMN "status" TYPE "ProductStatus"
            USING ("status"::text::"ProductStatus");

        DROP TYPE "ProductStatus_old";

        ALTER TABLE "Product"
            ALTER COLUMN "status" SET DEFAULT 'DRAFT';

        ALTER TABLE "ProductVariant"
            ALTER COLUMN "status" SET DEFAULT 'DRAFT';
    END IF;
END $$;
