"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { MovementType } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";

import { getSession } from "@/lib/auth/auth";

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
        approvedBy: {
          select: {
            name: true,
            email: true,
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

export async function getMovementBatchById(id: string) {
  const batch = await prisma.inventoryMovement.findUnique({
    where: { id },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      details: {
        include: {
          product: true,
        },
      },
      approvedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return batch;
}

export async function getMovements() {
  const movements = await prisma.inventoryMovementDetail.findMany({
    include: {
      product: true,
      inventoryMovement: {
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          approvedBy: {
            select: {
              name: true,
              email: true,
            },
          },
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
            status: "PENDING",
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
            status: "PENDING",
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

export const approveMovement = authorizedAction(
  "inventory_movements.create", // TODO: Add specific permission for approval?
  async (movementId: string) => {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    try {
      await prisma.$transaction(async (tx) => {
        const movement = await tx.inventoryMovement.findUniqueOrThrow({
          where: { id: movementId },
          include: { details: true },
        });

        if (movement.status !== "PENDING") {
          throw new Error("Movement is not pending");
        }

        // Execute inventory updates for each detail
        for (const detail of movement.details) {
          await executeInventoryUpdate(tx, {
            type: movement.type,
            productId: detail.productId,
            fromWarehouseId: movement.fromWarehouseId,
            toWarehouseId: movement.toWarehouseId,
            quantity: detail.quantity,
            unitCost: detail.unitCost.toNumber(),
            batchNumber: detail.batchNumber || "-",
            locationId: null, // TODO: Store locationId in detail?
          });
        }

        // Update status
        await tx.inventoryMovement.update({
          where: { id: movementId },
          data: {
            status: "COMPLETED",
            approvedById: session.userId,
            approvedAt: new Date(),
          },
        });
      });

      revalidatePath("/inventory/movements");
      revalidatePath("/inventory/warehouses");
      revalidatePath("/inventory/products");
      return { success: true };
    } catch (error) {
      console.error("Failed to approve movement:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to approve movement",
      };
    }
  }
);

export const rejectMovement = authorizedAction(
  "inventory_movements.create",
  async (data: { movementId: string; reason: string }) => {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    try {
      await prisma.inventoryMovement.update({
        where: { id: data.movementId },
        data: {
          status: "REJECTED",
          rejectionReason: data.reason,
          approvedById: session.userId, // Recorded as the one who rejected
          approvedAt: new Date(),
        },
      });

      revalidatePath("/inventory/movements");
      return { success: true };
    } catch (error) {
      console.error("Failed to reject movement:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reject movement",
      };
    }
  }
);

import { Prisma } from "@/prisma/generated/prisma/client";

async function executeInventoryUpdate(
  tx: Prisma.TransactionClient,
  data: {
    type: MovementType;
    productId: string;
    fromWarehouseId: string | null;
    toWarehouseId: string | null;
    quantity: number;
    unitCost: number;
    batchNumber: string;
    locationId: string | null;
  }
) {
  const {
    type,
    productId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    unitCost,
    batchNumber,
    locationId,
  } = data;

  // 1. Handle Valuation & Costing Updates (Moving Average)
  if (type === "IN") {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
    });

    const allInventory = await tx.inventory.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });

    const totalExistingQty = allInventory._sum.quantity || 0;
    const oldTotalValue = product.averageCost.toNumber() * totalExistingQty;
    const newTotalValue = oldTotalValue + quantity * unitCost;
    const newTotalQty = totalExistingQty + quantity;

    if (newTotalQty > 0) {
      const newAverageCost = newTotalValue / newTotalQty;
      await tx.product.update({
        where: { id: productId },
        data: { averageCost: newAverageCost },
      });
    }
  }

  // 2. Update Inventory (With Location & Batch Logic)
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
        quantity: { increment: quantity },
      },
      create: {
        productId,
        warehouseId: toWarehouseId,
        quantity: quantity,
        batchNumber: batchNumber,
        unitCost: unitCost,
        locationId: locationId || null,
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
          quantity: { gte: quantity },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!oldestStock) {
        // Fetch product name for error message
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        throw new Error(
          `Insufficient stock in warehouse ${fromWarehouseId} for product ${
            product?.name || productId
          }`
        );
      }
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

    if (!inventory || inventory.quantity < quantity) {
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
        quantity: { decrement: quantity },
      },
    });
  } else if (type === "TRANSFER") {
    if (!fromWarehouseId || !toWarehouseId)
      throw new Error("Both warehouses required");

    // Check source stock
    // TODO: This logic simplifies transfer by assuming picking from one batch or oldest.
    // If batchNumber is provided, we use it. If not, we find oldest.
    let sourceBatch = batchNumber;
    let sourceUnitCost = 0;

    if (sourceBatch === "-") {
      const sourceStock = await tx.inventory.findFirst({
        where: {
          productId,
          warehouseId: fromWarehouseId,
          quantity: { gte: quantity },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!sourceStock) throw new Error("Insufficient source stock");
      sourceBatch = sourceStock.batchNumber || "-";
      sourceUnitCost = sourceStock.unitCost.toNumber();
    } else {
      const sourceStock = await tx.inventory.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId,
            warehouseId: fromWarehouseId,
            batchNumber: sourceBatch,
          },
        },
      });
      if (!sourceStock || sourceStock.quantity < quantity)
        throw new Error("Insufficient source stock");
      sourceUnitCost = sourceStock.unitCost.toNumber();
    }

    await tx.inventory.update({
      where: {
        productId_warehouseId_batchNumber: {
          productId,
          warehouseId: fromWarehouseId,
          batchNumber: sourceBatch,
        },
      },
      data: { quantity: { decrement: quantity } },
    });

    await tx.inventory.upsert({
      where: {
        productId_warehouseId_batchNumber: {
          productId,
          warehouseId: toWarehouseId,
          batchNumber: sourceBatch,
        },
      },
      update: { quantity: { increment: quantity } },
      create: {
        productId,
        warehouseId: toWarehouseId,
        quantity: quantity,
        batchNumber: sourceBatch,
        unitCost: sourceUnitCost,
        locationId: locationId || null,
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
        quantity: { increment: quantity },
      },
      create: {
        productId,
        warehouseId: toWarehouseId,
        quantity: quantity,
        batchNumber: adjBatch,
        unitCost: unitCost,
        locationId: locationId || null,
      },
    });
  }
}

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
    status?: "PENDING" | "COMPLETED";
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
    status = "COMPLETED",
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

  // 1. Create Movement Detail Record
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

  // 2. Execute Inventory Update if not pending
  if (status !== "PENDING") {
    await executeInventoryUpdate(tx, {
      type,
      productId,
      fromWarehouseId: fromWarehouseId || null,
      toWarehouseId: toWarehouseId || null,
      quantity: baseQuantity,
      unitCost: movementUnitCost,
      batchNumber,
      locationId: data.locationId || null,
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
        // Create header
        const movement = await tx.inventoryMovement.create({
          data: {
            type: data.type,
            reference: data.reference,
            notes: data.notes,
            status: "PENDING",
            fromWarehouseId: data.fromWarehouseId || null,
            toWarehouseId: data.toWarehouseId || null,
          },
        });

        await processMovement(tx, {
          ...data,
          inventoryMovementId: movement.id,
          status: "PENDING",
        });
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
