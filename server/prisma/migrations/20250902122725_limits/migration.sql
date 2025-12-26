/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Limits` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Limits" DROP COLUMN "createdAt",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "week" INTEGER;
