type ProductLike = {
  cost: number | string;
  purchaseConversionFactor?: number | string | null;
};

export function calculatePurchaseUnitCost(product: ProductLike): number {
  const baseCost = Number(product.cost);
  if (!Number.isFinite(baseCost) || baseCost < 0) {
    return 0;
  }

  const factorRaw = Number(product.purchaseConversionFactor ?? 1);
  const factor = Number.isFinite(factorRaw) && factorRaw > 0 ? factorRaw : 1;
  return baseCost * factor;
}
