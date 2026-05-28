"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { z } from "zod";
import { MovementType } from "@/prisma/generated/prisma/client";
import { InventoryService } from "@/modules/inventory/services/inventory.service";
import { JournalService } from "@/modules/accounting/services/journal.service";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-account.service";
import { Decimal } from "decimal.js";

const INVENTORY_ADJUSTMENT_TX_TIMEOUT_MS = 8_000;

const adjustmentLineSchema = z.object({
  productId: z.string().min(1),
  actualStock: z.number().int(),
  note: z.string().optional(),
});

const postStockAdjustmentSchema = z.object({
  warehouseId: z.string().min(1),
  note: z.string().optional(),
  lines: z.array(adjustmentLineSchema).min(1),
});

export async function getStockAdjustmentFormData() {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, "inventory.view")
  ) {
    return SuperJSON.serialize({
      warehouses: [],
      products: [],
    });
  }

  const [warehouses, products] = await Promise.all([
    prisma.warehouse.findMany({
      where: { companyId: session.activeCompanyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { isActive: true, companyId: session.activeCompanyId, manageStock: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        averageCost: true,
        cost: true,
        baseUnit: {
          select: { symbol: true },
        },
      },
    }),
  ]);

  return SuperJSON.serialize({
    warehouses,
    products: products.map((product) => ({
      ...product,
      averageCost: Number(product.averageCost ?? 0),
      cost: Number(product.cost ?? 0),
    })),
  });
}

export async function getWarehouseStockSnapshot(warehouseId: string) {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, "inventory.view")
  ) {
    return SuperJSON.serialize([]);
  }

  const inventory = await prisma.inventory.findMany({
    where: {
      warehouseId,
      warehouse: { companyId: session.activeCompanyId },
    },
    select: {
      productId: true,
      quantity: true,
      unitCost: true,
    },
  });

  const aggregated = new Map<string, { quantity: number; unitCost: Decimal }>();

  for (const row of inventory) {
    const existing = aggregated.get(row.productId);
    const rowCost = new Decimal(row.unitCost ?? 0);
    if (!existing) {
      aggregated.set(row.productId, {
        quantity: row.quantity,
        unitCost: rowCost,
      });
      continue;
    }

    const totalQty = existing.quantity + row.quantity;
    const weightedCost = totalQty > 0
      ? existing.unitCost.mul(existing.quantity).plus(rowCost.mul(row.quantity)).div(totalQty)
      : existing.unitCost;

    aggregated.set(row.productId, {
      quantity: totalQty,
      unitCost: weightedCost,
    });
  }

  return SuperJSON.serialize(
    Array.from(aggregated.entries()).map(([productId, data]) => ({
      productId,
      currentStock: data.quantity,
      unitCost: data.unitCost.toNumber(),
    })),
  );
}

export const postStockAdjustment = authorizedAction(
  "inventory_movements.create",
  async (rawData: unknown) => {
    const parsed = postStockAdjustmentSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const data = parsed.data;
    const session = await getSession();
    if (!session || !session.activeCompanyId) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      const [inventoryAssetAccount, adjustmentExpenseAccount, adjustmentIncomeAccount] =
        await Promise.all([
          getRequiredDefaultAccount("INVENTORY_ASSET"),
          getRequiredDefaultAccount("UNCATEGORIZED_EXPENSE"),
          getRequiredDefaultAccount("UNCATEGORIZED_INCOME"),
        ]);

      const result = await prisma.$transaction(async (tx) => {
        const warehouse = await tx.warehouse.findFirst({
          where: {
            id: data.warehouseId,
            companyId: session.activeCompanyId!,
          },
          select: { id: true },
        });
        if (!warehouse) {
          throw new Error("Warehouse not found in active company");
        }

        const currentRows = await tx.inventory.findMany({
          where: {
            warehouseId: data.warehouseId,
            product: { companyId: session.activeCompanyId! },
          },
          select: { productId: true, quantity: true },
        });

        const currentByProduct = new Map<string, number>();
        for (const row of currentRows) {
          currentByProduct.set(row.productId, (currentByProduct.get(row.productId) || 0) + row.quantity);
        }

        const productCosts = await tx.product.findMany({
          where: {
            id: { in: data.lines.map((line) => line.productId) },
            companyId: session.activeCompanyId!,
          },
          select: { id: true, averageCost: true, cost: true, name: true, sku: true },
        });
        if (productCosts.length !== data.lines.length) {
          throw new Error("One or more products are not in active company");
        }
        const costByProduct = new Map(productCosts.map((p) => [p.id, new Decimal(p.averageCost ?? p.cost ?? 0)]));

        const adjustmentItems = data.lines
          .map((line) => {
            const currentStock = currentByProduct.get(line.productId) || 0;
            const diff = line.actualStock - currentStock;
            return {
              ...line,
              currentStock,
              diff,
            };
          })
          .filter((line) => line.diff !== 0);

        if (adjustmentItems.length === 0) {
          throw new Error("No stock difference to post");
        }

        const movement = await InventoryService.createInventoryMovement(tx, {
          type: MovementType.ADJUSTMENT,
          companyId: session.activeCompanyId!,
          warehouseId: data.warehouseId,
          reference: `ADJ-${Date.now()}`,
          notes: data.note || "Stock adjustment",
          status: "COMPLETED",
          items: adjustmentItems.map((line) => ({
            productId: line.productId,
            quantity: line.diff,
            unitCost: costByProduct.get(line.productId) || 0,
            notes: line.note,
          })),
        });

        const journalLines: Array<{
          accountId: string;
          debitAmount: number;
          creditAmount: number;
          description: string;
        }> = [];

        for (const item of adjustmentItems) {
          const unitCost = costByProduct.get(item.productId) || new Decimal(0);
          const amount = unitCost.mul(Math.abs(item.diff));
          if (amount.lte(0)) continue;

          const product = productCosts.find((p) => p.id === item.productId);
          const productLabel = product ? `${product.name} (${product.sku})` : item.productId;

          if (item.diff < 0) {
            journalLines.push({
              accountId: adjustmentExpenseAccount.accountId,
              debitAmount: amount.toNumber(),
              creditAmount: 0,
              description: `Inventory loss adjustment: ${productLabel}`,
            });
            journalLines.push({
              accountId: inventoryAssetAccount.accountId,
              debitAmount: 0,
              creditAmount: amount.toNumber(),
              description: `Inventory decrease: ${productLabel}`,
            });
          } else {
            journalLines.push({
              accountId: inventoryAssetAccount.accountId,
              debitAmount: amount.toNumber(),
              creditAmount: 0,
              description: `Inventory increase: ${productLabel}`,
            });
            journalLines.push({
              accountId: adjustmentIncomeAccount.accountId,
              debitAmount: 0,
              creditAmount: amount.toNumber(),
              description: `Inventory gain adjustment: ${productLabel}`,
            });
          }
        }

        let journalEntryId: string | null = null;
        if (journalLines.length > 0) {
          const journalEntry = await JournalService.createJournalEntry({
            entryNumber: `JE-${movement.reference || movement.id}`,
            transactionDate: new Date(),
            description: `Stock Adjustment ${movement.reference || movement.id}`,
            notes: data.note,
            lines: journalLines,
          }, session.userId, tx);

          await JournalService.postJournalEntry(journalEntry.id, tx);
          journalEntryId = journalEntry.id;
        }

        return {
          movementId: movement.id,
          journalEntryId,
          adjustedLines: adjustmentItems.length,
        };
      }, { timeout: INVENTORY_ADJUSTMENT_TX_TIMEOUT_MS });

      revalidateLocalizedPath("/inventory/adjustments");
      revalidateLocalizedPath("/inventory/movements");
      revalidateLocalizedPath("/inventory/warehouses");
      revalidateLocalizedPath("/inventory/products");
      revalidateLocalizedPath("/accounting/journal-entries");

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post stock adjustment",
      };
    }
  },
);
