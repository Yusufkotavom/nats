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
      unitCost: item.unitCost.toNumber(),
      product: {
        ...item.product,
        price: item.product.price?.toNumber(),
        cost: item.product.cost?.toNumber(),
        averageCost: item.product.averageCost?.toNumber(),
        purchaseConversionFactor:
          item.product.purchaseConversionFactor?.toNumber(),
        salesConversionFactor: item.product.salesConversionFactor?.toNumber(),
      },
    })),

    recentMovements: recentMovements.map((movement) => ({
      ...movement,
      unitCost: movement.product?.cost?.toNumber(),
      product: {
        ...movement.product,
        price: movement?.product?.price?.toNumber(),
        cost: movement?.product?.cost?.toNumber(),
        averageCost: movement?.product?.averageCost?.toNumber(),
        purchaseConversionFactor:
          movement?.product?.purchaseConversionFactor?.toNumber(),
        salesConversionFactor:
          movement?.product?.salesConversionFactor?.toNumber(),
      },
    })),
  };
}
