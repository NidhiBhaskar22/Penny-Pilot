/*
  Warnings:

  - You are about to drop the column `amount` on the `EMI` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `EMI` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `EMI` table. All the data in the column will be lost.
  - You are about to drop the column `paid` on the `EMI` table. All the data in the column will be lost.
  - You are about to drop the column `paidDate` on the `EMI` table. All the data in the column will be lost.
  - You are about to drop the column `amoutPaid` on the `SplitExpense` table. All the data in the column will be lost.
  - Added the required column `emiAmount` to the `EMI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numInstallments` to the `EMI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaininginstallments` to the `EMI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `EMI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `EMI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `EMI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paidByUserId` to the `SplitExpense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Balance" ALTER COLUMN "lastWeek" SET DEFAULT 0,
ALTER COLUMN "lastMonth" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "EMI" DROP COLUMN "amount",
DROP COLUMN "description",
DROP COLUMN "dueDate",
DROP COLUMN "paid",
DROP COLUMN "paidDate",
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emiAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "numInstallments" INTEGER NOT NULL,
ADD COLUMN     "remaininginstallments" INTEGER NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "details" TEXT,
ADD COLUMN     "projections" TEXT,
ADD COLUMN     "roi" DOUBLE PRECISION,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "MoneyBorrowed" ADD COLUMN     "purpose" TEXT;

-- AlterTable
ALTER TABLE "MoneyLent" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "purpose" TEXT;

-- AlterTable
ALTER TABLE "SplitExpense" DROP COLUMN "amoutPaid",
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paidByUserId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRecord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "financialYear" TEXT NOT NULL,
    "taxableIncome" DOUBLE PRECISION NOT NULL,
    "exemptions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRecord" ADD CONSTRAINT "TaxRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
