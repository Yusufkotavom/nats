import { describe, expect, it, vi } from "vitest";
import {
  resolveBomConsumptionItems,
  resolveStockConsumptionItems,
} from "./bom-consumption.service";

describe("resolveBomConsumptionItems", () => {
  it("returns empty when no sold items", async () => {
    const tx: any = { billOfMaterial: { findFirst: vi.fn() } };
    const result = await resolveBomConsumptionItems(tx, []);
    expect(result).toEqual([]);
    expect(tx.billOfMaterial.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to empty when no BOM found", async () => {
    const tx: any = {
      billOfMaterial: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await resolveBomConsumptionItems(tx, [
      { productId: "p1", quantity: 2 },
    ]);

    expect(result).toEqual([]);
  });

  it("explodes bundle items using active BOM", async () => {
    const tx: any = {
      billOfMaterial: {
        findFirst: vi.fn().mockResolvedValue({
          id: "bom-1",
          items: [
            { productId: "ing-a", quantity: "2" },
            { productId: "ing-b", quantity: "1" },
          ],
        }),
      },
    };

    const result = await resolveBomConsumptionItems(tx, [
      { productId: "bundle-1", quantity: 3 },
    ]);

    expect(result).toEqual([
      { productId: "ing-a", quantity: 6 },
      { productId: "ing-b", quantity: 3 },
    ]);
  });

  it("throws when BOM conversion results in non-integer quantity", async () => {
    const tx: any = {
      billOfMaterial: {
        findFirst: vi.fn().mockResolvedValue({
          id: "bom-1",
          items: [{ productId: "ing-a", quantity: "0.5" }],
        }),
      },
    };

    await expect(
      resolveBomConsumptionItems(tx, [{ productId: "bundle-1", quantity: 3 }])
    ).rejects.toThrow("non-integer consumption");
  });
});

describe("resolveStockConsumptionItems", () => {
  it("skips service product without BOM", async () => {
    const tx: any = {
      product: {
        findUnique: vi.fn().mockResolvedValue({ isService: true }),
      },
      billOfMaterial: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await resolveStockConsumptionItems(tx, [
      { productId: "svc-1", quantity: 2 },
    ]);

    expect(result).toEqual([]);
  });

  it("consumes product itself when non-service has no BOM", async () => {
    const tx: any = {
      product: {
        findUnique: vi.fn().mockResolvedValue({ isService: false }),
      },
      billOfMaterial: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await resolveStockConsumptionItems(tx, [
      { productId: "prd-1", quantity: 3 },
    ]);

    expect(result).toEqual([{ productId: "prd-1", quantity: 3 }]);
  });

  it("consumes BOM components for service with BOM", async () => {
    const tx: any = {
      product: {
        findUnique: vi.fn().mockResolvedValue({ isService: true }),
      },
      billOfMaterial: {
        findFirst: vi.fn().mockResolvedValue({
          id: "bom-1",
          items: [{ productId: "paper", quantity: "2" }],
        }),
      },
    };

    const result = await resolveStockConsumptionItems(tx, [
      { productId: "svc-print", quantity: 4 },
    ]);

    expect(result).toEqual([{ productId: "paper", quantity: 8 }]);
  });
});
