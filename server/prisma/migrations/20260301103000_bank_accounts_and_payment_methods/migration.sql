-- 1) Payment method enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethodType') THEN
    CREATE TYPE "PaymentMethodType" AS ENUM ('NET_BANKING', 'UPI', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD');
  END IF;
END $$;

-- 2) AccountMethod table (enabled methods per bank account)
CREATE TABLE IF NOT EXISTS "AccountMethod" (
  "id" SERIAL PRIMARY KEY,
  "accountId" INTEGER NOT NULL,
  "method" "PaymentMethodType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountMethod_accountId_method_key"
  ON "AccountMethod" ("accountId", "method");
CREATE INDEX IF NOT EXISTS "AccountMethod_accountId_idx"
  ON "AccountMethod" ("accountId");

ALTER TABLE "AccountMethod"
  ADD CONSTRAINT "AccountMethod_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Ensure transaction accountId points to bank account only (if older method-accounts were used)
UPDATE "Income" i
SET "accountId" = a."parentId"
FROM "Account" a
WHERE i."accountId" = a."id" AND a."parentId" IS NOT NULL;

UPDATE "Expense" e
SET "accountId" = a."parentId"
FROM "Account" a
WHERE e."accountId" = a."id" AND a."parentId" IS NOT NULL;

UPDATE "Investment" v
SET "accountId" = a."parentId"
FROM "Account" a
WHERE v."accountId" = a."id" AND a."parentId" IS NOT NULL;

-- 4) Add paymentMethod enum columns on transactions
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethodType";
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethodType";
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethodType";

-- 5) Backfill paymentMethod from previous paymentMethodId relation where available
UPDATE "Income" i
SET "paymentMethod" = CASE UPPER(COALESCE(a."type", ''))
  WHEN 'NET_BANKING' THEN 'NET_BANKING'::"PaymentMethodType"
  WHEN 'UPI' THEN 'UPI'::"PaymentMethodType"
  WHEN 'CASH' THEN 'CASH'::"PaymentMethodType"
  WHEN 'DEBIT_CARD' THEN 'DEBIT_CARD'::"PaymentMethodType"
  WHEN 'CREDIT_CARD' THEN 'CREDIT_CARD'::"PaymentMethodType"
  ELSE 'CASH'::"PaymentMethodType"
END
FROM "Account" a
WHERE i."paymentMethodId" = a."id" AND i."paymentMethod" IS NULL;

UPDATE "Expense" e
SET "paymentMethod" = CASE UPPER(COALESCE(a."type", ''))
  WHEN 'NET_BANKING' THEN 'NET_BANKING'::"PaymentMethodType"
  WHEN 'UPI' THEN 'UPI'::"PaymentMethodType"
  WHEN 'CASH' THEN 'CASH'::"PaymentMethodType"
  WHEN 'DEBIT_CARD' THEN 'DEBIT_CARD'::"PaymentMethodType"
  WHEN 'CREDIT_CARD' THEN 'CREDIT_CARD'::"PaymentMethodType"
  ELSE 'CASH'::"PaymentMethodType"
END
FROM "Account" a
WHERE e."paymentMethodId" = a."id" AND e."paymentMethod" IS NULL;

UPDATE "Investment" v
SET "paymentMethod" = CASE UPPER(COALESCE(a."type", ''))
  WHEN 'NET_BANKING' THEN 'NET_BANKING'::"PaymentMethodType"
  WHEN 'UPI' THEN 'UPI'::"PaymentMethodType"
  WHEN 'CASH' THEN 'CASH'::"PaymentMethodType"
  WHEN 'DEBIT_CARD' THEN 'DEBIT_CARD'::"PaymentMethodType"
  WHEN 'CREDIT_CARD' THEN 'CREDIT_CARD'::"PaymentMethodType"
  ELSE 'CASH'::"PaymentMethodType"
END
FROM "Account" a
WHERE v."paymentMethodId" = a."id" AND v."paymentMethod" IS NULL;

-- 6) fallback value when old relation is missing
UPDATE "Income" SET "paymentMethod" = 'CASH'::"PaymentMethodType" WHERE "paymentMethod" IS NULL;
UPDATE "Expense" SET "paymentMethod" = 'CASH'::"PaymentMethodType" WHERE "paymentMethod" IS NULL;
UPDATE "Investment" SET "paymentMethod" = 'CASH'::"PaymentMethodType" WHERE "paymentMethod" IS NULL;

ALTER TABLE "Income" ALTER COLUMN "paymentMethod" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "paymentMethod" SET NOT NULL;
ALTER TABLE "Investment" ALTER COLUMN "paymentMethod" SET NOT NULL;

-- 7) Migrate old child-method accounts into AccountMethod table
INSERT INTO "AccountMethod" ("accountId", "method", "createdAt")
SELECT DISTINCT
  a."parentId" AS "accountId",
  CASE UPPER(COALESCE(a."type", ''))
    WHEN 'NET_BANKING' THEN 'NET_BANKING'::"PaymentMethodType"
    WHEN 'UPI' THEN 'UPI'::"PaymentMethodType"
    WHEN 'CASH' THEN 'CASH'::"PaymentMethodType"
    WHEN 'DEBIT_CARD' THEN 'DEBIT_CARD'::"PaymentMethodType"
    WHEN 'CREDIT_CARD' THEN 'CREDIT_CARD'::"PaymentMethodType"
  END AS "method",
  COALESCE(a."createdAt", CURRENT_TIMESTAMP)
FROM "Account" a
WHERE a."parentId" IS NOT NULL
  AND UPPER(COALESCE(a."type", '')) IN ('NET_BANKING', 'UPI', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD')
ON CONFLICT ("accountId", "method") DO NOTHING;

-- 8) Drop old transaction method FK columns
DROP INDEX IF EXISTS "Income_paymentMethodId_idx";
DROP INDEX IF EXISTS "Expense_paymentMethodId_idx";
DROP INDEX IF EXISTS "Investment_paymentMethodId_idx";

ALTER TABLE "Income" DROP CONSTRAINT IF EXISTS "Income_paymentMethodId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_paymentMethodId_fkey";
ALTER TABLE "Investment" DROP CONSTRAINT IF EXISTS "Investment_paymentMethodId_fkey";

ALTER TABLE "Income" DROP COLUMN IF EXISTS "paymentMethodId";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "paymentMethodId";
ALTER TABLE "Investment" DROP COLUMN IF EXISTS "paymentMethodId";

-- 9) Delete old child method accounts. Keep only root bank accounts.
DELETE FROM "Account" WHERE "parentId" IS NOT NULL;

-- 10) Drop old hierarchy/type columns not needed now
DROP INDEX IF EXISTS "Account_userId_type_idx";
DROP INDEX IF EXISTS "Account_userId_parentId_idx";
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_parentId_fkey";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "parentId";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "type";
