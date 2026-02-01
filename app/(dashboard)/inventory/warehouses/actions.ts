"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SuperJSON } from "@/lib/superjson";

export async function getWarehouses(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const [warehouses, total] = await Promise.all([
    prisma.warehouse.findMany({
      include: {
        inventory: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.warehouse.count(),
  ]);

  return {
    warehouses: SuperJSON.serialize(warehouses),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

import { authorizedAction } from "@/lib/permissions/protected-action";

export const createWarehouse = authorizedAction(
  "warehouses.create",
  async (data: { name: string; location?: string }) => {
    try {
      const warehouse = await prisma.warehouse.create({
        data,
      });
      revalidatePath("/inventory/warehouses");
      return { success: true, data: warehouse };
    } catch (error) {
      console.error("Failed to create warehouse:", error);
      return { success: false, error: "Failed to create warehouse" };
    }
  }
);

export const updateWarehouse = authorizedAction(
  "warehouses.edit",
  async (id: string, data: { name: string; location?: string }) => {
    try {
      const warehouse = await prisma.warehouse.update({
        where: { id },
        data,
      });
      revalidatePath("/inventory/warehouses");
      return { success: true, data: warehouse };
    } catch (error) {
      console.error("Failed to update warehouse:", error);
      return { success: false, error: "Failed to update warehouse" };
    }
  }
);

export const deleteWarehouse = authorizedAction(
  "warehouses.delete",
  async (id: string) => {
    try {
      await prisma.warehouse.delete({
        where: { id },
      });
      revalidatePath("/inventory/warehouses");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete warehouse:", error);
      return { success: false, error: "Failed to delete warehouse" };
    }
  }
);

export async function getInventoryLevels(warehouseId?: string) {
  const where = warehouseId ? { warehouseId } : {};

  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: {
      product: { name: "asc" },
    },
  });

  return SuperJSON.serialize(inventory);
}
