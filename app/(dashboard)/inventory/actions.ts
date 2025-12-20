"use server";

import { prisma } from "@/lib/prisma";

export async function getInventoryDashboardMetrics() {
  const [
    totalProducts,
    totalValueResult,
    lowStockItemsResult,
    recentMovements,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.$queryRaw`
      SELECT SUM(p.cost * i.quantity) as total_value
      FROM "Inventory" i
      JOIN "Product" p ON i."productId" = p.id
    `,
    prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Inventory" WHERE quantity <= "reorderPoint" LIMIT 5
      `,
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

  const lowStockIds = (lowStockItemsResult as { id: string }[]).map(
    (item) => item.id
  );

  const lowStockItems = await prisma.inventory.findMany({
    where: {
      id: {
        in: lowStockIds,
      },
    },
    include: {
      product: true,
      warehouse: true,
    },
  });

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
