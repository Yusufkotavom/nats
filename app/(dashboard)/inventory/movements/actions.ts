"use server";

import { prisma } from "@/lib/prisma";
import { MovementType } from "@/prisma/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SuperJSON } from "@/lib/superjson";

import { getSession } from "@/lib/auth/auth";
import { executeInventoryUpdate, processMovement } from "./logic";

export async function getCompanyProfile() {
  const companyProfile = await prisma.companyProfile.findFirst();
  return SuperJSON.serialize(companyProfile);
}

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
    batches: SuperJSON.serialize(batches),
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
          product: {
            include: {
              baseUnit: true,
            },
          },
        },
      },
      approvedBy: {
        select: {
          name: true,
          email: true,
          id: true,
        },
      },
    },
  });

  if (!batch) return null;

  return SuperJSON.serialize(batch);
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

  return SuperJSON.serialize(movements);
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
  },
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
  },
);

export const rejectMovement = authorizedAction(
  "inventory_movements.create",
  async (movementId: string, reason: string) => {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    try {
      await prisma.inventoryMovement.update({
        where: { id: movementId },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          // approvedBy is not set for rejection, maybe add rejectedBy?
        },
      });

      revalidatePath("/inventory/movements");
      return { success: true };
    } catch (error) {
      console.error("Failed to reject movement:", error);
      return { success: false, error: "Failed to reject movement" };
    }
  },
);
