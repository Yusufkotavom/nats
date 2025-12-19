/*
  Warnings:

  - The values [ASSET,LIABILITY,EQUITY,REVENUE,EXPENSE,OTHER] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isPosting` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `normalBalance` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `JournalEntry` table. All the data in the column will be lost.
  - You are about to drop the column `postedAt` on the `JournalEntry` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `JournalEntry` table. All the data in the column will be lost.
  - You are about to drop the `JournalLine` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[entryNumber]` on the table `JournalEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entryNumber` to the `JournalEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionDate` to the `JournalEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `JournalEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'accountant', 'bookkeeper', 'viewer');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('draft', 'posted');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
ALTER TABLE "Account" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_accountId_fkey";

-- DropForeignKey
ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_entryId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "isPosting",
DROP COLUMN "level",
DROP COLUMN "normalBalance";

-- AlterTable
ALTER TABLE "JournalEntry" DROP COLUMN "date",
DROP COLUMN "postedAt",
DROP COLUMN "reference",
ADD COLUMN     "entryNumber" TEXT NOT NULL,
ADD COLUMN     "status" "EntryStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "transactionDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "JournalLine";

-- DropEnum
DROP TYPE "NormalBalance";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "lineNumber" INTEGER NOT NULL,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

-- CreateIndex
CREATE INDEX "Account_code_idx" ON "Account"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON "JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalEntry_transactionDate_idx" ON "JournalEntry"("transactionDate");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_idx" ON "JournalEntry"("userId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
