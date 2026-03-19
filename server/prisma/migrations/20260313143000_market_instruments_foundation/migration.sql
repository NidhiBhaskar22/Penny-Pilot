-- Create enums
CREATE TYPE "InstrumentAssetType" AS ENUM (
  'STOCK',
  'ETF',
  'MUTUAL_FUND',
  'INDEX',
  'CRYPTO',
  'FOREX',
  'COMMODITY',
  'OTHER'
);

CREATE TYPE "InvestmentTransactionType" AS ENUM ('BUY', 'SELL');

-- Create instruments master table
CREATE TABLE "Instrument" (
  "id" SERIAL NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assetType" "InstrumentAssetType" NOT NULL DEFAULT 'OTHER',
  "exchange" TEXT,
  "currency" TEXT,
  "sector" TEXT,
  "industry" TEXT,
  "country" TEXT,
  "description" TEXT,
  "imageUrl" TEXT,
  "expenseRatio" DECIMAL(10,4),
  "aum" DECIMAL(18,2),
  "isEtf" BOOLEAN NOT NULL DEFAULT false,
  "isFund" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- Create latest quote cache table
CREATE TABLE "InstrumentQuote" (
  "id" SERIAL NOT NULL,
  "instrumentId" INTEGER NOT NULL,
  "price" DECIMAL(18,4) NOT NULL,
  "change" DECIMAL(18,4),
  "changePercent" DECIMAL(10,4),
  "marketCap" BIGINT,
  "volume" BIGINT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstrumentQuote_pkey" PRIMARY KEY ("id")
);

-- Create transaction ledger for market-linked investments
CREATE TABLE "InvestmentTransaction" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "instrumentId" INTEGER NOT NULL,
  "accountId" INTEGER,
  "paymentMethod" "PaymentMethodType" NOT NULL,
  "transactionType" "InvestmentTransactionType" NOT NULL DEFAULT 'BUY',
  "quantity" DECIMAL(18,6) NOT NULL,
  "price" DECIMAL(18,4) NOT NULL,
  "fees" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "transactedAt" TIMESTAMP(3) NOT NULL,
  "month" TEXT NOT NULL,
  "week" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvestmentTransaction_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Instrument_symbol_key" ON "Instrument"("symbol");
CREATE INDEX "Instrument_assetType_idx" ON "Instrument"("assetType");
CREATE INDEX "Instrument_name_idx" ON "Instrument"("name");

CREATE UNIQUE INDEX "InstrumentQuote_instrumentId_key" ON "InstrumentQuote"("instrumentId");

CREATE INDEX "InvestmentTransaction_userId_transactedAt_idx" ON "InvestmentTransaction"("userId", "transactedAt");
CREATE INDEX "InvestmentTransaction_instrumentId_transactedAt_idx" ON "InvestmentTransaction"("instrumentId", "transactedAt");
CREATE INDEX "InvestmentTransaction_accountId_idx" ON "InvestmentTransaction"("accountId");

-- Foreign keys
ALTER TABLE "InstrumentQuote"
ADD CONSTRAINT "InstrumentQuote_instrumentId_fkey"
FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvestmentTransaction"
ADD CONSTRAINT "InvestmentTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvestmentTransaction"
ADD CONSTRAINT "InvestmentTransaction_instrumentId_fkey"
FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvestmentTransaction"
ADD CONSTRAINT "InvestmentTransaction_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
