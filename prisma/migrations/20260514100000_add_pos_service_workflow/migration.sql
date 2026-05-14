-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isService" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "POSServiceOrderStatus" AS ENUM ('NEW', 'PROCESSING', 'READY', 'DONE', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "POSServiceOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" "POSServiceOrderStatus" NOT NULL DEFAULT 'NEW',
  "posSessionId" TEXT NOT NULL,
  "contactId" TEXT,
  "salesOrderId" TEXT NOT NULL,
  "salesInvoiceId" TEXT NOT NULL,
  "notes" TEXT,
  "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "dpAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "remainingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "targetDate" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "processingAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "doneAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "POSServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSServiceOrderItem" (
  "id" TEXT NOT NULL,
  "posServiceOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(65,30) NOT NULL,
  "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalPrice" DECIMAL(65,30) NOT NULL,
  "hasActiveBom" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "POSServiceOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "POSServiceOrder_orderNumber_key" ON "POSServiceOrder"("orderNumber");
CREATE INDEX "POSServiceOrder_posSessionId_status_idx" ON "POSServiceOrder"("posSessionId", "status");
CREATE INDEX "POSServiceOrder_salesOrderId_idx" ON "POSServiceOrder"("salesOrderId");
CREATE INDEX "POSServiceOrder_salesInvoiceId_idx" ON "POSServiceOrder"("salesInvoiceId");
CREATE INDEX "POSServiceOrderItem_posServiceOrderId_idx" ON "POSServiceOrderItem"("posServiceOrderId");
CREATE INDEX "POSServiceOrderItem_productId_idx" ON "POSServiceOrderItem"("productId");

-- AddForeignKey
ALTER TABLE "POSServiceOrder" ADD CONSTRAINT "POSServiceOrder_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "POSSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "POSServiceOrderItem" ADD CONSTRAINT "POSServiceOrderItem_posServiceOrderId_fkey" FOREIGN KEY ("posServiceOrderId") REFERENCES "POSServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "POSServiceOrderItem" ADD CONSTRAINT "POSServiceOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
