import { describe, expect, it } from "vitest";
import { calculatePurchaseUnitCost } from "./purchase-pricing";

describe("calculatePurchaseUnitCost", () => {
  it("multiplies base cost by purchase conversion factor", () => {
    const cost = calculatePurchaseUnitCost({
      cost: 2200,
      purchaseConversionFactor: 50,
    });

    expect(cost).toBe(110000);
  });

  it("falls back to base cost when conversion factor is missing", () => {
    const cost = calculatePurchaseUnitCost({
      cost: 5000,
    });

    expect(cost).toBe(5000);
  });

  it("falls back to factor 1 when conversion factor is invalid", () => {
    const cost = calculatePurchaseUnitCost({
      cost: 5000,
      purchaseConversionFactor: 0,
    });

    expect(cost).toBe(5000);
  });
});
