-- Add payment method linkage on transactions.
ALTER TABLE "Income"
ADD COLUMN "paymentMethodId" INTEGER;

ALTER TABLE "Expense"
ADD COLUMN "paymentMethodId" INTEGER;

ALTER TABLE "Investment"
ADD COLUMN "paymentMethodId" INTEGER;

CREATE INDEX "Income_paymentMethodId_idx" ON "Income"("paymentMethodId");
CREATE INDEX "Expense_paymentMethodId_idx" ON "Expense"("paymentMethodId");
CREATE INDEX "Investment_paymentMethodId_idx" ON "Investment"("paymentMethodId");

ALTER TABLE "Income"
ADD CONSTRAINT "Income_paymentMethodId_fkey"
FOREIGN KEY ("paymentMethodId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_paymentMethodId_fkey"
FOREIGN KEY ("paymentMethodId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Investment"
ADD CONSTRAINT "Investment_paymentMethodId_fkey"
FOREIGN KEY ("paymentMethodId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
