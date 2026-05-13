-- CreateEnum
CREATE TYPE "BudgetKind" AS ENUM ('BUDGET', 'SAVING_TARGET');

-- AlterTable
ALTER TABLE "Budget"
ADD COLUMN "kind" "BudgetKind" NOT NULL DEFAULT 'BUDGET',
ADD COLUMN "periodStart" TIMESTAMP(3),
ADD COLUMN "periodEnd" TIMESTAMP(3);
