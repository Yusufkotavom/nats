"use server";

import { prisma } from "@/lib/prisma";
import { MovementType } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function getMovements() {
  const movements = await prisma.inventoryMovement.findMany({
    include: {
      product: true,
      fromWarehouse: true,
      toWarehouse: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map((movement) => ({
    ...movement,
    product: {
      ...movement.product,
      price: Number(movement.product.price),
      cost: Number(movement.product.cost),
    },
  }));
}

import { authorizedAction } from "@/lib/permissions/protected-action";

export const createMovement = authorizedAction(
  "inventory_movements.create",
  async (data: {
    type: MovementType;
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity: number;
    uomType?: "base" | "purchase" | "sales";
    unitCost?: number; // Optional override cost, otherwise use default
    locationId?: string; // For IN/TRANSFER/ADJUSTMENT
    reference?: string;
    notes?: string;
    batchNumber?: string;
  }) => {
    const {
      type,
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reference,
      notes,
    } = data;

    // Explicit Batch or Auto-Generate
    const batchNumber =
      data.batchNumber ||
      (type === "IN"
        ? new Date().toISOString().slice(0, 10).replace(/-/g, "") +
          "-" +
          Math.floor(Math.random() * 1000)
        : "-");

    if (quantity <= 0 && type !== "ADJUSTMENT") {
      return {
        success: false,
        error: "Quantity must be positive for IN, OUT, and TRANSFER",
      };
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Fetch Product for Costing
        const product = await tx.product.findUniqueOrThrow({
          where: { id: productId },
        });

        // 0. Handle UOM Conversion
        let conversionFactor = 1;
        if (data.uomType === "purchase")
          conversionFactor = Number(product.purchaseConversionFactor) || 1;
        else if (data.uomType === "sales")
          conversionFactor = Number(product.salesConversionFactor) || 1;

        // Convert Input Quantity to Base Quantity
        const baseQuantity = Math.floor(quantity * conversionFactor);

        // Determine Unit Cost (Per Base Unit)
        // If provided (e.g. from PO), it's usually Per Input Unit -> Convert to Per Base Unit
        // If not provided, use Product Average Cost (which is already Per Base Unit)
        let movementUnitCost = 0;
        if (data.unitCost !== undefined) {
          movementUnitCost = data.unitCost / conversionFactor;
        } else {
          movementUnitCost = Number(product.averageCost || product.cost);
        }

        // 1. Handle Valuation & Costing Updates (Moving Average)
        if (type === "IN" && data.unitCost !== undefined) {
          // Calculate New Weighted Average Cost
          // Formula: ((Old Qty * Old Avg) + (New Qty * New Cost)) / (Old Qty + New Qty)
          // Note: We need Total System Quantity for this product, not just one warehouse
          const allInventory = await tx.inventory.aggregate({
            where: { productId },
            _sum: { quantity: true },
          });

          const totalExistingQty = allInventory._sum.quantity || 0;
          const oldTotalValue = Number(product.averageCost) * totalExistingQty;
          const newTotalValue = oldTotalValue + baseQuantity * movementUnitCost;
          const newTotalQty = totalExistingQty + baseQuantity;

          if (newTotalQty > 0) {
            const newAverageCost = newTotalValue / newTotalQty;
            await tx.product.update({
              where: { id: productId },
              data: { averageCost: newAverageCost },
            });
          }
        } else if (type === "OUT") {
          // For OUT, we consume cost. We don't change Average Cost.
          // Ideally we should record the Cost of Goods Sold (COGS) here based on current Average Cost
          movementUnitCost = Number(product.averageCost);
        }

        // 2. Create Movement Record
        await tx.inventoryMovement.create({
          data: {
            type,
            productId,
            fromWarehouseId: fromWarehouseId || null,
            toWarehouseId: toWarehouseId || null,
            quantity: baseQuantity,
            unitCost: movementUnitCost,
            reference,
            notes,
            status: "COMPLETED",
          },
        });

        // 3. Update Inventory (With Location & Batch Logic)
        if (type === "IN") {
          if (!toWarehouseId)
            throw new Error("Destination warehouse required for IN");

          // For now, default to no specific location (null) if not provided
          // TODO: Add locationId param support in future UI

          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: toWarehouseId,
                batchNumber: batchNumber,
              },
            },
            update: {
              quantity: { increment: baseQuantity },
              // Update unitCost only if it's a restock of same batch?
              // Usually IN is new batch. If same batch, maybe weighted avg again?
              // For simplicity: keep existing unitCost if exists, or update if 0
            },
            create: {
              productId,
              warehouseId: toWarehouseId,
              quantity: baseQuantity,
              batchNumber: batchNumber,
              unitCost: movementUnitCost,
              locationId: data.locationId || null,
            },
          });
        } else if (type === "OUT") {
          if (!fromWarehouseId)
            throw new Error("Source warehouse required for OUT");

          // FIFO Strategy or Specific Batch?
          // For now, simple deduction from specific batch or oldest batch
          // If batch not specified, we need to find stock!

          let targetBatch = batchNumber;

          if (targetBatch === "-") {
            // Auto-find batch (FIFO logic: Find oldest batch with qty > 0)
            const oldestStock = await tx.inventory.findFirst({
              where: {
                productId,
                warehouseId: fromWarehouseId,
                quantity: { gte: baseQuantity },
              },
              orderBy: { createdAt: "asc" },
            });

            if (!oldestStock)
              throw new Error(
                `Insufficient stock in warehouse ${fromWarehouseId} for product ${product.name}`
              );
            targetBatch = oldestStock.batchNumber || "-";
          }

          const inventory = await tx.inventory.findUnique({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: fromWarehouseId,
                batchNumber: targetBatch,
              },
            },
          });

          if (!inventory || inventory.quantity < baseQuantity) {
            throw new Error(
              `Insufficient stock in warehouse ${fromWarehouseId}`
            );
          }

          await tx.inventory.update({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: fromWarehouseId,
                batchNumber: targetBatch,
              },
            },
            data: {
              quantity: { decrement: baseQuantity },
            },
          });
        } else if (type === "TRANSFER") {
          // Similar logic to OUT + IN
          // 1. Deduct Source
          if (!fromWarehouseId || !toWarehouseId)
            throw new Error("Both warehouses required");

          // Find Source Batch (FIFO)
          const sourceStock = await tx.inventory.findFirst({
            where: {
              productId,
              warehouseId: fromWarehouseId,
              quantity: { gte: baseQuantity },
            },
            orderBy: { createdAt: "asc" },
          });

          if (!sourceStock) throw new Error("Insufficient source stock");

          await tx.inventory.update({
            where: { id: sourceStock.id },
            data: { quantity: { decrement: baseQuantity } },
          });

          // 2. Add Destination (Keep same batch number & cost to maintain traceability)
          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: toWarehouseId,
                batchNumber: sourceStock.batchNumber || "-",
              },
            },
            update: { quantity: { increment: baseQuantity } },
            create: {
              productId,
              warehouseId: toWarehouseId,
              quantity: baseQuantity,
              batchNumber: sourceStock.batchNumber || "-",
              unitCost: sourceStock.unitCost, // Carry over cost
              locationId: data.locationId || null,
            },
          });
        } else if (type === "ADJUSTMENT") {
          // Adjustment logic...
          if (!toWarehouseId) throw new Error("Warehouse required");

          // If batch provided use it, else default
          const adjBatch =
            batchNumber === "-" ? "ADJ-" + new Date().getTime() : batchNumber;

          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: toWarehouseId,
                batchNumber: adjBatch,
              },
            },
            update: {
              quantity: { increment: baseQuantity },
            },
            create: {
              productId,
              warehouseId: toWarehouseId,
              quantity: baseQuantity,
              batchNumber: adjBatch,
              unitCost: movementUnitCost,
              locationId: data.locationId || null,
            },
          });
        }
      });

      revalidatePath("/inventory/movements");
      revalidatePath("/inventory/warehouses");
      revalidatePath("/inventory/products");
      return { success: true };
    } catch (error) {
      console.error("Failed to create movement:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create movement",
      };
    }
  }
);
