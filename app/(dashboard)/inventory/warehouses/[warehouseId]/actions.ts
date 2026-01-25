"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { SuperJSON } from "@/lib/superjson";

export async function getWarehouse(warehouseId: string) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });
  return SuperJSON.serialize(warehouse);
}

export async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return SuperJSON.serialize(categories);
}

export async function getWarehouseInventory(
  warehouseId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string,
) {
  const skip = (page - 1) * limit;

  const where: Prisma.InventoryWhereInput = {
    warehouseId,
    product: {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(categoryId && categoryId !== "ALL" ? { categoryId } : {}),
    },
  };

  const [inventory, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            baseUnit: true,
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
      skip,
      take: limit,
    }),
    prisma.inventory.count({
      where,
    }),
  ]);

  return {
    inventory: SuperJSON.serialize(inventory),
    total,
    totalPages: Math.ceil(total / limit),
  };
}
