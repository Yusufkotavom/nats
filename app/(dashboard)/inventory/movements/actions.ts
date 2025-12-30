"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { MovementType } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";

export async function getMovementBatches(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        details: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.inventoryMovement.count(),
  ]);

  return {
    batches,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMovements() {
  const movements = await prisma.inventoryMovementDetail.findMany({
    include: {
      product: true,
      inventoryMovement: {
        include: {
          fromWarehouse: true,
          toWarehouse: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return serializePrisma(movements);
}

export const createBatchMovement = authorizedAction(
  "inventory_movements.create",
  async (data: {
    type: MovementType;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    items: {
      productId: string;
      quantity: number;
      uomType?: "base" | "purchase" | "sales";
      unitCost?: number;
      locationId?: string;
      batchNumber?: string;
      notes?: string;
    }[];
    reference?: string;
    notes?: string;
  }) => {
    const { type, fromWarehouseId, toWarehouseId, items, reference, notes } =
      data;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create the Batch Header (Master)
        const batch = await tx.inventoryMovement.create({
          data: {
            type,
            reference,
            notes,
            status: "COMPLETED", // Assuming immediate completion for now
            fromWarehouseId: fromWarehouseId || null,
            toWarehouseId: toWarehouseId || null,
          },
        });

        // 2. Process each movement item (Detail)
        for (const item of items) {
          await processMovement(tx, {
            type,
            productId: item.productId,
            fromWarehouseId,
            toWarehouseId,
            quantity: item.quantity,
            uomType: item.uomType,
            unitCost: item.unitCost,
            locationId: item.locationId,
            reference, // Can inherit from batch or be specific
            notes: item.notes || notes,
            batchNumber: item.batchNumber,
            inventoryMovementId: batch.id, // Link to the master
          });
        }
      });

      revalidatePath("/inventory/movements");
      revalidatePath("/inventory/warehouses");
      revalidatePath("/inventory/products");
      return { success: true };
    } catch (error) {
      console.error("Failed to create batch movement:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create batch movement",
      };
    }
  }
);

import { Prisma } from "@/prisma/generated/prisma/client";

async function processMovement(
  tx: Prisma.TransactionClient,
  data: {
    type: MovementType;
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity: number;
    uomType?: "base" | "purchase" | "sales";
    unitCost?: number; // Optional override cost
    locationId?: string;
    reference?: string;
    notes?: string;
    batchNumber?: string;
    inventoryMovementId?: string;
  }
) {
  const {
    type,
    productId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    notes,
    inventoryMovementId,
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
    throw new Error("Quantity must be positive for IN, OUT, and TRANSFER");
  }

  // Fetch Product for Costing
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
  });

  // 0. Handle UOM Conversion
  let conversionFactor = 1;
  if (data.uomType === "purchase")
    conversionFactor = product.purchaseConversionFactor?.toNumber() || 1;
  else if (data.uomType === "sales")
    conversionFactor = product.salesConversionFactor?.toNumber() || 1;

  // Convert Input Quantity to Base Quantity
  const baseQuantity = Math.floor(quantity * conversionFactor);

  // Determine Unit Cost (Per Base Unit)
  let movementUnitCost = 0;
  if (data.unitCost !== undefined) {
    movementUnitCost = data.unitCost / conversionFactor;
  } else {
    movementUnitCost =
      product.averageCost?.toNumber() || product.cost?.toNumber() || 0;
  }

  // 1. Handle Valuation & Costing Updates (Moving Average)
  if (type === "IN" && data.unitCost !== undefined) {
    const allInventory = await tx.inventory.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });

    const totalExistingQty = allInventory._sum.quantity || 0;
    const oldTotalValue = product.averageCost.toNumber() * totalExistingQty;
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
    movementUnitCost = product.averageCost.toNumber();
  }

  // 2. Create Movement Detail Record
  await tx.inventoryMovementDetail.create({
    data: {
      inventoryMovementId: inventoryMovementId!, // Must exist now for batch context
      productId,
      quantity: baseQuantity,
      unitCost: movementUnitCost,
      notes,
      batchNumber: batchNumber, // Inventory Batch
    },
  });

  // 3. Update Inventory (With Location & Batch Logic)
  if (type === "IN") {
    if (!toWarehouseId)
      throw new Error("Destination warehouse required for IN");

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
    if (!fromWarehouseId) throw new Error("Source warehouse required for OUT");

    let targetBatch = batchNumber;

    if (targetBatch === "-") {
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
      throw new Error(`Insufficient stock in warehouse ${fromWarehouseId}`);
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
    if (!fromWarehouseId || !toWarehouseId)
      throw new Error("Both warehouses required");

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
        unitCost: sourceStock.unitCost,
        locationId: data.locationId || null,
      },
    });
  } else if (type === "ADJUSTMENT") {
    if (!toWarehouseId) throw new Error("Warehouse required");

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
}

export const createMovement = authorizedAction(
  "inventory_movements.create",
  async (data: {
    type: MovementType;
    productId: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity: number;
    uomType?: "base" | "purchase" | "sales";
    unitCost?: number;
    locationId?: string;
    reference?: string;
    notes?: string;
    batchNumber?: string;
  }) => {
    try {
      await prisma.$transaction(async (tx) => {
        await processMovement(tx, data);
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
