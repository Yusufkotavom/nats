import { describe, expect, it } from "vitest";
import {
  RESTAURANT_ID_PACKAGE_BOMS,
  RESTAURANT_ID_PRODUCTS,
} from "../seed-restaurant-id";

describe("restaurant indonesia seed catalog", () => {
  it("contains sunda/seafood menus and common indo drinks", () => {
    const skus = new Set(RESTAURANT_ID_PRODUCTS.map((item) => item.sku));

    expect(skus.has("ID-MENU-NASI-TIMBEL")).toBe(true);
    expect(skus.has("ID-MENU-GURAME-BAKAR")).toBe(true);
    expect(skus.has("ID-MENU-CUMI-GORENG")).toBe(true);
    expect(skus.has("ID-MENU-ES-TEH")).toBe(true);
    expect(skus.has("ID-MENU-ES-JERUK")).toBe(true);
    expect(skus.has("ID-MENU-AIR-MINERAL")).toBe(true);
  });

  it("keeps package BOM minimal and references valid product SKU", () => {
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
});
