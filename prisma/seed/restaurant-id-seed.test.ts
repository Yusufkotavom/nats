import { describe, expect, it } from "vitest";
import {
  RESTAURANT_ID_BOM_CANDIDATES,
  RESTAURANT_ID_PACKAGE_BOMS,
  RESTAURANT_ID_PRODUCTS,
} from "../seed-restaurant-id";

describe("restaurant indonesia seed catalog", () => {
  it("contains full transcript menu catalog with representative items", () => {
    const skus = new Set(RESTAURANT_ID_PRODUCTS.map((item) => item.sku));

    expect(RESTAURANT_ID_PRODUCTS.length).toBeGreaterThanOrEqual(150);
    expect(skus.has("ID-UDS-TELOR-ASIN")).toBe(true);
    expect(skus.has("ID-GURAME-COBEK")).toBe(true);
    expect(skus.has("ID-KEPITING-JANTAN-TELOR-ASIN")).toBe(true);
    expect(skus.has("ID-CUMI-GORENG-TEPUNG")).toBe(true);
    expect(skus.has("ID-AYAM-GRG-KREMES")).toBe(true);
    expect(skus.has("ID-TUMIS-KANGKUNG")).toBe(true);
    expect(skus.has("ID-ES-TEH-MANIS")).toBe(true);
    expect(skus.has("ID-CARAMEL-MACCHIATO")).toBe(true);
    expect(skus.has("ID-RUJAK-MANIS")).toBe(true);
  });

  it("keeps package BOM valid and references product SKU from catalog", () => {
    const skus = new Set(RESTAURANT_ID_PRODUCTS.map((item) => item.sku));

    expect(RESTAURANT_ID_PACKAGE_BOMS.length).toBe(3);

    for (const bom of RESTAURANT_ID_PACKAGE_BOMS) {
      expect(skus.has(bom.productSku)).toBe(true);
      expect(bom.quantity).toBeGreaterThan(0);
      expect(Number.isInteger(bom.quantity)).toBe(true);
      expect(bom.components.length).toBeGreaterThan(0);

      for (const component of bom.components) {
        expect(skus.has(component.sku)).toBe(true);
        expect(component.quantity).toBeGreaterThan(0);
        expect(Number.isInteger(component.quantity)).toBe(true);
      }
    }
  });

  it("provides BOM candidate mapping one by one for all seeded products", () => {
    expect(RESTAURANT_ID_BOM_CANDIDATES.length).toBe(RESTAURANT_ID_PRODUCTS.length);
    for (const candidate of RESTAURANT_ID_BOM_CANDIDATES) {
      expect(typeof candidate.sku).toBe("string");
      expect(candidate.sku.length).toBeGreaterThan(0);
      expect(typeof candidate.bomHint).toBe("string");
      expect(candidate.bomHint.length).toBeGreaterThan(0);
    }
  });
});
