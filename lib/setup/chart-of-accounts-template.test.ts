import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, DEFAULT_UNITS } from "./chart-of-accounts-template";

describe("setup defaults", () => {
  it("includes menu-friendly categories for restaurant POS", () => {
    const names = DEFAULT_CATEGORIES.map((category) => category.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "General",
        "Menu Makanan",
        "Menu Minuman",
        "Menu Snack",
        "Menu Dessert",
        "Bahan Baku",
      ]),
    );
  });

  it("does not contain duplicate category names or unit symbols", () => {
    const categoryNames = DEFAULT_CATEGORIES.map((category) => category.name);
    const unitSymbols = DEFAULT_UNITS.map((unit) => unit.symbol);

    expect(new Set(categoryNames).size).toBe(categoryNames.length);
    expect(new Set(unitSymbols).size).toBe(unitSymbols.length);
  });
});
