-- CreateEnum
CREATE TYPE "RestaurantOrderStatus" AS ENUM ('OPEN', 'SENT_TO_KITCHEN', 'BILLING', 'PAID', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KitchenTicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KitchenItemStatus" AS ENUM ('NEW', 'COOKING', 'READY', 'SERVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RestaurantOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" "RestaurantOrderStatus" NOT NULL DEFAULT 'OPEN',
  "diningSpotId" TEXT NOT NULL,
  "posSessionId" TEXT NOT NULL,
  "contactId" TEXT,
  "salesInvoiceId" TEXT,
  "notes" TEXT,
  "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "itemDiscount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "globalDiscount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalFees" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "sentToKitchenAt" TIMESTAMP(3),
  "billedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderItem" (
  "id" TEXT NOT NULL,
  "restaurantOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderedQuantity" INTEGER NOT NULL,
  "servedQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(65,30) NOT NULL,
  "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicket" (
  "id" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "restaurantOrderId" TEXT NOT NULL,
  "diningSpotId" TEXT NOT NULL,
  "status" "KitchenTicketStatus" NOT NULL DEFAULT 'NEW',
  "notes" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicketItem" (
  "id" TEXT NOT NULL,
  "kitchenTicketId" TEXT NOT NULL,
  "restaurantOrderItemId" TEXT,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "station" TEXT NOT NULL,
  "status" "KitchenItemStatus" NOT NULL DEFAULT 'NEW',
  "note" TEXT,
  "startedAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "servedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KitchenTicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOrder_orderNumber_key" ON "RestaurantOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOrder_salesInvoiceId_key" ON "RestaurantOrder"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_diningSpotId_status_idx" ON "RestaurantOrder"("diningSpotId", "status");

-- CreateIndex
CREATE INDEX "RestaurantOrder_posSessionId_status_idx" ON "RestaurantOrder"("posSessionId", "status");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_restaurantOrderId_idx" ON "RestaurantOrderItem"("restaurantOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTicket_ticketNumber_key" ON "KitchenTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "KitchenTicket_diningSpotId_status_idx" ON "KitchenTicket"("diningSpotId", "status");

-- CreateIndex
CREATE INDEX "KitchenTicket_restaurantOrderId_status_idx" ON "KitchenTicket"("restaurantOrderId", "status");

-- CreateIndex
CREATE INDEX "KitchenTicketItem_kitchenTicketId_station_idx" ON "KitchenTicketItem"("kitchenTicketId", "station");

-- CreateIndex
CREATE INDEX "KitchenTicketItem_status_station_idx" ON "KitchenTicketItem"("status", "station");

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_diningSpotId_fkey" FOREIGN KEY ("diningSpotId") REFERENCES "DiningSpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "POSSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_restaurantOrderId_fkey" FOREIGN KEY ("restaurantOrderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_restaurantOrderId_fkey" FOREIGN KEY ("restaurantOrderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_diningSpotId_fkey" FOREIGN KEY ("diningSpotId") REFERENCES "DiningSpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_kitchenTicketId_fkey" FOREIGN KEY ("kitchenTicketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_restaurantOrderItemId_fkey" FOREIGN KEY ("restaurantOrderItemId") REFERENCES "RestaurantOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
