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

import { authorizedAction } from "@/lib/auth/protected-action";

export const createMovement = authorizedAction(
  "inventory_movements.create",
  async (data: {
    type: MovementType;
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity: number;
    reference?: string;
    notes?: string;
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

    if (quantity <= 0 && type !== "ADJUSTMENT") {
      return {
        success: false,
        error: "Quantity must be positive for IN, OUT, and TRANSFER",
      };
    }

    // Use "-" as default batch number for non-batched items to ensure uniqueness
    const DEFAULT_BATCH = "-";

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create Movement Record
        await tx.inventoryMovement.create({
          data: {
            type,
            productId,
            fromWarehouseId: fromWarehouseId || null,
            toWarehouseId: toWarehouseId || null,
            quantity,
            reference,
            notes,
            status: "COMPLETED", // Auto-complete for now
          },
        });

        // 2. Update Inventory
        if (type === "IN") {
          if (!toWarehouseId)
            throw new Error("Destination warehouse required for IN");

          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: toWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
            update: {
              quantity: { increment: quantity },
            },
            create: {
              productId,
              warehouseId: toWarehouseId,
              quantity: quantity,
              batchNumber: DEFAULT_BATCH,
            },
          });
        } else if (type === "OUT") {
          if (!fromWarehouseId)
            throw new Error("Source warehouse required for OUT");

          const inventory = await tx.inventory.findUnique({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: fromWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
          });

          if (!inventory || inventory.quantity < quantity) {
            throw new Error(
              `Insufficient stock in warehouse ${fromWarehouseId}`
            );
          }

          await tx.inventory.update({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: fromWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
            data: {
              quantity: { decrement: quantity },
            },
          });
        } else if (type === "TRANSFER") {
          if (!fromWarehouseId || !toWarehouseId)
            throw new Error("Both warehouses required for TRANSFER");

          // Check source stock
          const sourceInventory = await tx.inventory.findUnique({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: fromWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
          });

          if (!sourceInventory || sourceInventory.quantity < quantity) {
            throw new Error(`Insufficient stock in source warehouse`);
          }

          // Decrement Source
          await tx.inventory.update({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: fromWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
            data: {
              quantity: { decrement: quantity },
            },
          });

          // Increment Destination
          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: toWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
            update: {
              quantity: { increment: quantity },
            },
            create: {
              productId,
              warehouseId: toWarehouseId,
              quantity: quantity,
              batchNumber: DEFAULT_BATCH,
            },
          });
        } else if (type === "ADJUSTMENT") {
          if (!toWarehouseId)
            throw new Error("Warehouse required for ADJUSTMENT");

          if (quantity < 0) {
            const current = await tx.inventory.findUnique({
              where: {
                productId_warehouseId_batchNumber: {
                  productId,
                  warehouseId: toWarehouseId,
                  batchNumber: DEFAULT_BATCH,
                },
              },
            });
            // Optional: prevent negative stock
            // if (!current || current.quantity + quantity < 0) { ... }
          }

          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId,
                warehouseId: toWarehouseId,
                batchNumber: DEFAULT_BATCH,
              },
            },
            update: {
              quantity: { increment: quantity },
            },
            create: {
              productId,
              warehouseId: toWarehouseId,
              quantity: quantity,
              batchNumber: DEFAULT_BATCH,
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
