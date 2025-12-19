"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getWarehouses() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      inventory: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return warehouses.map((warehouse) => ({
    ...warehouse,
    inventory: warehouse.inventory.map((inv) => ({
      ...inv,
      product: {
        ...inv.product,
        price: Number(inv.product.price),
        cost: Number(inv.product.cost),
      },
    })),
  }));
}

export async function createWarehouse(data: {
  name: string;
  location?: string;
}) {
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

export async function updateWarehouse(
  id: string,
  data: { name: string; location?: string }
) {
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

export async function deleteWarehouse(id: string) {
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

export async function getInventoryLevels(warehouseId?: string) {
  const where = warehouseId ? { warehouseId } : {};
  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: {
      product: {
        name: "asc",
      },
    },
  });

  return inventory.map((inv) => ({
    ...inv,
    product: {
      ...inv.product,
      price: Number(inv.product.price),
      cost: Number(inv.product.cost),
    },
  }));
}
