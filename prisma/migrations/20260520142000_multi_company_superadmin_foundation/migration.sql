-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "DefaultAccount" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "ContactCommunicationLog" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "ContactMessageTemplate" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "PurchasePayment" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseReceive" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseReturn" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "SalesShipment" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "SalesPayment" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "SalesReturn" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "POSSession" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "HeldOrder" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "DiningArea" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "DiningSpot" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "DiningSpotSession" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "POSFeeSetting" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "POSServiceOrder" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "RestaurantOrder" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "KitchenTicket" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyImpersonationAudit" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "impersonatedCompanyId" TEXT NOT NULL,
    "impersonatedUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyImpersonationAudit_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy profile and membership into multi-company baseline
INSERT INTO "Company" ("id", "code", "name", "status", "createdAt", "updatedAt")
SELECT
  'company-' || cp."id",
  (
    trim(
      both '-'
      FROM lower(regexp_replace(coalesce(nullif(cp."name", ''), 'company'), '[^a-zA-Z0-9]+', '-', 'g'))
    ) || '-' || substring(cp."id" FROM 1 FOR 6)
  ),
  coalesce(nullif(cp."name", ''), 'Company'),
  'ACTIVE'::"CompanyStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "CompanyProfile" cp
ON CONFLICT ("id") DO NOTHING;

UPDATE "CompanyProfile" cp
SET "companyId" = 'company-' || cp."id"
WHERE cp."companyId" IS NULL;

WITH first_company AS (
  SELECT "id"
  FROM "Company"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
INSERT INTO "CompanyMembership" ("id", "companyId", "userId", "isDefault", "createdAt", "updatedAt")
SELECT
  'membership-' || u."id",
  fc."id",
  u."id",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN first_company fc
WHERE NOT EXISTS (
  SELECT 1
  FROM "CompanyMembership" cm
  WHERE cm."companyId" = fc."id"
    AND cm."userId" = u."id"
);

ALTER TABLE "CompanyProfile"
ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "CompanyMembership_userId_idx" ON "CompanyMembership"("userId");

-- CreateIndex
CREATE INDEX "CompanyMembership_companyId_isDefault_idx" ON "CompanyMembership"("companyId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_companyId_userId_key" ON "CompanyMembership"("companyId", "userId");

-- CreateIndex
CREATE INDEX "CompanyImpersonationAudit_actorUserId_startedAt_idx" ON "CompanyImpersonationAudit"("actorUserId", "startedAt");

-- CreateIndex
CREATE INDEX "CompanyImpersonationAudit_impersonatedCompanyId_startedAt_idx" ON "CompanyImpersonationAudit"("impersonatedCompanyId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_companyId_key" ON "CompanyProfile"("companyId");

-- CreateIndex
CREATE INDEX "Account_companyId_idx" ON "Account"("companyId");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_idx" ON "JournalEntry"("companyId");

-- CreateIndex
CREATE INDEX "DefaultAccount_companyId_idx" ON "DefaultAccount"("companyId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "ContactCommunicationLog_companyId_createdAt_idx" ON "ContactCommunicationLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessageTemplate_companyId_idx" ON "ContactMessageTemplate"("companyId");

-- CreateIndex
CREATE INDEX "Unit_companyId_idx" ON "Unit"("companyId");

-- CreateIndex
CREATE INDEX "Category_companyId_idx" ON "Category"("companyId");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_idx" ON "InventoryMovement"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_idx" ON "PurchaseOrder"("companyId");

-- CreateIndex
CREATE INDEX "PurchasePayment_companyId_idx" ON "PurchasePayment"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseReceive_companyId_idx" ON "PurchaseReceive"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_companyId_idx" ON "PurchaseInvoice"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseReturn_companyId_idx" ON "PurchaseReturn"("companyId");

-- CreateIndex
CREATE INDEX "SalesOrder_companyId_idx" ON "SalesOrder"("companyId");

-- CreateIndex
CREATE INDEX "SalesShipment_companyId_idx" ON "SalesShipment"("companyId");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_idx" ON "SalesInvoice"("companyId");

-- CreateIndex
CREATE INDEX "SalesPayment_companyId_idx" ON "SalesPayment"("companyId");

-- CreateIndex
CREATE INDEX "SalesReturn_companyId_idx" ON "SalesReturn"("companyId");

-- CreateIndex
CREATE INDEX "POSSession_companyId_status_idx" ON "POSSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "HeldOrder_companyId_createdAt_idx" ON "HeldOrder"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "DiningArea_companyId_sortOrder_idx" ON "DiningArea"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "DiningSpot_companyId_status_idx" ON "DiningSpot"("companyId", "status");

-- CreateIndex
CREATE INDEX "DiningSpotSession_companyId_status_idx" ON "DiningSpotSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "POSFeeSetting_companyId_sortOrder_idx" ON "POSFeeSetting"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "POSServiceOrder_companyId_status_idx" ON "POSServiceOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "RestaurantOrder_companyId_status_idx" ON "RestaurantOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "KitchenTicket_companyId_status_idx" ON "KitchenTicket"("companyId", "status");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyImpersonationAudit" ADD CONSTRAINT "CompanyImpersonationAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyImpersonationAudit" ADD CONSTRAINT "CompanyImpersonationAudit_impersonatedCompanyId_fkey" FOREIGN KEY ("impersonatedCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyImpersonationAudit" ADD CONSTRAINT "CompanyImpersonationAudit_impersonatedUserId_fkey" FOREIGN KEY ("impersonatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultAccount" ADD CONSTRAINT "DefaultAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCommunicationLog" ADD CONSTRAINT "ContactCommunicationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessageTemplate" ADD CONSTRAINT "ContactMessageTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceive" ADD CONSTRAINT "PurchaseReceive_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesShipment" ADD CONSTRAINT "SalesShipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSession" ADD CONSTRAINT "POSSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeldOrder" ADD CONSTRAINT "HeldOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningArea" ADD CONSTRAINT "DiningArea_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningSpot" ADD CONSTRAINT "DiningSpot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningSpotSession" ADD CONSTRAINT "DiningSpotSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSFeeSetting" ADD CONSTRAINT "POSFeeSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSServiceOrder" ADD CONSTRAINT "POSServiceOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
