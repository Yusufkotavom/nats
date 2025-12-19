"use server";

import { prisma } from "@/lib/prisma";

export async function getInventoryDashboardMetrics() {
  const [totalProducts, totalValueResult, lowStockItems, recentMovements] =
    await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.$queryRaw`
      SELECT SUM(p.cost * i.quantity) as total_value
      FROM "Inventory" i
      JOIN "Product" p ON i."productId" = p.id
    `,
      prisma.inventory.findMany({
        where: {
          quantity: {
            lte: prisma.inventory.fields.reorderPoint,
          },
        },
        include: {
          product: true,
          warehouse: true,
        },
        take: 5,
      }),
      prisma.inventoryMovement.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
          fromWarehouse: true,
          toWarehouse: true,
        },
      }),
    ]);

  const totalValue =
    (totalValueResult as unknown as { total_value: number }[])[0]
      ?.total_value || 0;

  return {
    totalProducts,
    totalValue: Number(totalValue),
    lowStockItems: lowStockItems.map((item) => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price),
        cost: Number(item.product.cost),
      },
    })),
    recentMovements: recentMovements.map((movement) => ({
      ...movement,
      product: {
        ...movement.product,
        price: Number(movement.product.price),
        cost: Number(movement.product.cost),
      },
    })),
  };
}
