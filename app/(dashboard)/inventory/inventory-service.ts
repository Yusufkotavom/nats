import { MovementType, Prisma } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";

export interface CreateInventoryMovementData {
  type: MovementType;
  items: {
    productId: string;
    quantity: number;
    unitCost?: number | Decimal; // For IN movements
    batchNumber?: string;
    notes?: string;
  }[];
  warehouseId?: string;
  reference?: string; // e.g. PO-001, SHP-001
  notes?: string;
  transactionDate?: Date;
}

export class InventoryService {
  /**
   * Create an inventory movement and update related stock levels and costs.
   * This must be run within a transaction.
   */
  static async createInventoryMovement(
    tx: Prisma.TransactionClient,
    data: CreateInventoryMovementData
  ) {
    const {
      type,
      items,
      warehouseId: providedWarehouseId,
      reference,
      notes,
      transactionDate = new Date(),
    } = data;

    // 1. Resolve Warehouse
    let warehouseId = providedWarehouseId;
    if (!warehouseId) {
      const defaultWarehouse = await tx.warehouse.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (!defaultWarehouse) {
        throw new Error("No warehouse found. Please create a warehouse first.");
      }
      warehouseId = defaultWarehouse.id;
    }

    // 2. Create Movement Header
    const movement = await tx.inventoryMovement.create({
      data: {
        type,
        reference,
        notes,
        status: "COMPLETED", // Immediate completion for automated system movements
        transactionDate,
        // Depending on type, set from/to warehouse
        // IN: External -> To Warehouse
        // OUT: From Warehouse -> External
        toWarehouseId: type === "IN" ? warehouseId : undefined,
        fromWarehouseId: type === "OUT" ? warehouseId : undefined,
      },
    });

    // 3. Process Items
    for (const item of items) {
      const { productId, quantity, unitCost, batchNumber, notes: itemNotes } = item;

      // Create Movement Detail
      await tx.inventoryMovementDetail.create({
        data: {
          inventoryMovementId: movement.id,
          productId,
          quantity,
          unitCost: unitCost || 0,
          batchNumber,
          notes: itemNotes,
        },
      });

      // Update Inventory Stock & Cost
      await this.updateInventory(tx, {
        productId,
        warehouseId: warehouseId!,
        quantity,
        type,
        unitCost: unitCost ? new Decimal(unitCost) : undefined,
        batchNumber,
      });
    }

    return movement;
  }

  /**
   * Update inventory quantity and average cost.
   */
  private static async updateInventory(
    tx: Prisma.TransactionClient,
    params: {
      productId: string;
      warehouseId: string;
      quantity: number;
      type: MovementType;
      unitCost?: Decimal;
      batchNumber?: string;
    }
  ) {
    const { productId, warehouseId, quantity, type, unitCost, batchNumber } = params;

    // Fetch existing inventory record
    const inventory = await tx.inventory.findFirst({
      where: {
        productId,
        warehouseId
      },
    });

    let currentQty = inventory?.quantity || 0;
    let currentCost = inventory?.unitCost || new Decimal(0);

    // Fetch Product for Average Cost calculation
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    let productAvgCost = new Decimal(product.averageCost || 0);

    if (type === "IN") {
      // Moving Average Cost Calculation for Product (Global)
      // New Avg Cost = ((Current Total Qty * Current Avg Cost) + (Incoming Qty * Incoming Cost)) / (Current Total Qty + Incoming Qty)

      const totalStockAgg = await tx.inventory.aggregate({
        where: { productId },
        _sum: { quantity: true },
      });
      const totalStock = totalStockAgg._sum.quantity || 0;

      if (unitCost) {
        // totalValue = productAvgCost * totalStock + unitCost * quantity
        const totalValue = productAvgCost.mul(totalStock).plus(unitCost.mul(quantity));
        const newTotalStock = totalStock + quantity;

        if (newTotalStock > 0) {
          productAvgCost = totalValue.div(newTotalStock);
        }

        // Update Product Average Cost
        await tx.product.update({
          where: { id: productId },
          data: { averageCost: productAvgCost },
        });
      }

      // Update Warehouse specific Inventory
      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { increment: quantity },
            // Update the stored unit cost for this bucket if provided
            unitCost: unitCost || currentCost,
          },
        });
      } else {
        // Create new record
        await tx.inventory.create({
          data: {
            productId,
            warehouseId,
            quantity: quantity,
            unitCost: unitCost || productAvgCost,
            batchNumber,
          },
        });
      }

    } else if (type === "OUT") {
      // Check for sufficient stock
      if (currentQty < quantity) {
        throw new Error(`Insufficient stock for product ${product.name} (SKU: ${product.sku}). Available: ${currentQty}, Requested: ${quantity}`);
      }

      // Update Inventory
      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { decrement: quantity },
          },
        });
      } else {
        throw new Error(`Inventory record not found for product ${product.name}`);
      }
    }
  }
}
