"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { revalidatePath } from "next/cache";

type ResetTransactionsResult = {
  deleted: Record<string, number>;
};

const CONFIRMATION_TEXT = "RESET TRANSACTIONS";

export const resetTransactionalData = authorizedAction<
  ResetTransactionsResult,
  [string]
>("company.settings", async (confirmation: string) => {
  if (confirmation.trim().toUpperCase() !== CONFIRMATION_TEXT) {
    return {
      success: false,
      error: `Type "${CONFIRMATION_TEXT}" to confirm`,
    };
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const result: Record<string, number> = {};

    result.integrationInbox = (await tx.integrationInbox.deleteMany({})).count;
    result.integrationOutbox = (await tx.integrationOutbox.deleteMany({})).count;

    result.purchasePayments = (await tx.purchasePayment.deleteMany({})).count;
    result.purchaseInvoiceItems = (await tx.purchaseInvoiceItem.deleteMany({})).count;
    result.purchaseInvoices = (await tx.purchaseInvoice.deleteMany({})).count;
    result.purchaseReceiveItems = (await tx.purchaseReceiveItem.deleteMany({})).count;
    result.purchaseReceives = (await tx.purchaseReceive.deleteMany({})).count;
    result.purchaseReturnItems = (await tx.purchaseReturnItem.deleteMany({})).count;
    result.purchaseReturns = (await tx.purchaseReturn.deleteMany({})).count;
    result.purchaseOrderItems = (await tx.purchaseOrderItem.deleteMany({})).count;
    result.purchaseOrders = (await tx.purchaseOrder.deleteMany({})).count;

    result.salesPayments = (await tx.salesPayment.deleteMany({})).count;
    result.salesReturnItems = (await tx.salesReturnItem.deleteMany({})).count;
    result.salesReturns = (await tx.salesReturn.deleteMany({})).count;
    result.salesShipmentItems = (await tx.salesShipmentItem.deleteMany({})).count;
    result.salesShipments = (await tx.salesShipment.deleteMany({})).count;
    result.salesInvoiceItems = (await tx.salesInvoiceItem.deleteMany({})).count;
    result.salesInvoices = (await tx.salesInvoice.deleteMany({})).count;
    result.salesOrderItems = (await tx.salesOrderItem.deleteMany({})).count;
    result.salesOrders = (await tx.salesOrder.deleteMany({})).count;

    result.cashTransactionAllocations = (await tx.cashTransactionAllocation.deleteMany({})).count;
    result.cashTransactions = (await tx.cashTransaction.deleteMany({})).count;
    result.cashTransfers = (await tx.cashTransfer.deleteMany({})).count;

    result.posSessions = (await tx.pOSSession.deleteMany({})).count;
    result.heldOrders = (await tx.heldOrder.deleteMany({})).count;
    result.diningSpotSessions = (await tx.diningSpotSession.deleteMany({})).count;

    result.inventoryMovementDetails = (await tx.inventoryMovementDetail.deleteMany({})).count;
    result.inventoryMovements = (await tx.inventoryMovement.deleteMany({})).count;
    result.inventories = (await tx.inventory.deleteMany({})).count;

    result.journalEntryLines = (await tx.journalEntryLine.deleteMany({})).count;
    result.journalEntries = (await tx.journalEntry.deleteMany({})).count;

    result.reportLogs = (await tx.reportLog.deleteMany({})).count;

    return result;
  });

  revalidatePath("/purchase");
  revalidatePath("/sales");
  revalidatePath("/pos");
  revalidatePath("/cash-bank");
  revalidatePath("/inventory");
  revalidatePath("/accounting");
  revalidatePath("/admin/settings/data-reset");

  return { success: true, data: { deleted } };
});

export async function getResetPreviewCounts() {
  const [
    purchaseInvoices,
    purchasePayments,
    salesInvoices,
    salesPayments,
    inventoryMovements,
    journalEntries,
  ] = await Promise.all([
    prisma.purchaseInvoice.count(),
    prisma.purchasePayment.count(),
    prisma.salesInvoice.count(),
    prisma.salesPayment.count(),
    prisma.inventoryMovement.count(),
    prisma.journalEntry.count(),
  ]);

  return {
    purchaseInvoices,
    purchasePayments,
    salesInvoices,
    salesPayments,
    inventoryMovements,
    journalEntries,
  };
}

