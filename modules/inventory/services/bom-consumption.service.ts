import { Decimal } from "decimal.js";
import type { Prisma } from "@/prisma/generated/prisma/client";

export type MovementConsumptionItem = {
  productId: string;
  quantity: number;
};

export async function resolveBomConsumptionItems(
  tx: Prisma.TransactionClient,
  soldItems: MovementConsumptionItem[]
): Promise<MovementConsumptionItem[]> {
  if (soldItems.length === 0) return [];

  const aggregatedIngredients = new Map<string, number>();
  let hasAnyBOM = false;

  for (const soldItem of soldItems) {
    const bom = await tx.billOfMaterial.findFirst({
      where: {
        productId: soldItem.productId,
        isActive: true,
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!bom) continue;
    hasAnyBOM = true;

    for (const bomItem of bom.items) {
      const rawRequiredQty = new Decimal(bomItem.quantity).mul(soldItem.quantity);
      if (!rawRequiredQty.isInteger()) {
        throw new Error(
          `BOM quantity for product ${bomItem.productId} results in non-integer consumption (${rawRequiredQty.toString()}). ` +
            "Current inventory quantity only supports integer values. Please align base unit/conversion first."
        );
      }

      const requiredQty = rawRequiredQty.toNumber();
      aggregatedIngredients.set(
        bomItem.productId,
        (aggregatedIngredients.get(bomItem.productId) || 0) + requiredQty
      );
    }
  }

  if (!hasAnyBOM) return [];

  return Array.from(aggregatedIngredients.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}
