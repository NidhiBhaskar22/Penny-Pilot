-- Account hierarchy and account-linked investments
ALTER TABLE "Account"
ADD COLUMN "identifier" TEXT,
ADD COLUMN "parentId" INTEGER,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Account_userId_type_idx" ON "Account"("userId", "type");
CREATE INDEX "Account_userId_parentId_idx" ON "Account"("userId", "parentId");

ALTER TABLE "Account"
ADD CONSTRAINT "Account_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Investment"
ADD COLUMN "accountId" INTEGER;

ALTER TABLE "Investment"
ADD CONSTRAINT "Investment_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
