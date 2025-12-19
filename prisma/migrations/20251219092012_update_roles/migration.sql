/*
  Warnings:

  - The values [admin,accountant,bookkeeper,viewer] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('debit', 'credit');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('staff', 'supervisor', 'manager', 'superadmin');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'staff';
COMMIT;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "isPosting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "normalBalance" "NormalBalance" NOT NULL DEFAULT 'debit';

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "postedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'staff';
