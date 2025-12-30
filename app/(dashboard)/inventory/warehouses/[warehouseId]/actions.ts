"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";

export async function getWarehouse(warehouseId: string) {
  return prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getWarehouseInventory(
  warehouseId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string
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
    inventory: inventory.map((inv) => ({
      ...inv,
      unitCost: Number(inv.unitCost),
      product: {
        ...inv.product,
        price: Number(inv.product.price),
        cost: Number(inv.product.cost),
        averageCost: Number(inv.product.averageCost),
        purchaseConversionFactor: Number(inv.product.purchaseConversionFactor),
        salesConversionFactor: Number(inv.product.salesConversionFactor),
      },
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}
