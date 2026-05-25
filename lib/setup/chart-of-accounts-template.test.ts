import { describe, expect, it } from "vitest";
import {
  AVAILABLE_TEMPLATES,
  DEFAULT_CATEGORIES,
  DEFAULT_SAMPLE_CATALOG,
  DEFAULT_UNITS,
} from "./chart-of-accounts-template";

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
        "ATK & Percetakan",
        "Aksesoris HP",
        "Jasa Service",
      ]),
    );
  });

  it("does not contain duplicate category names or unit symbols", () => {
    const categoryNames = DEFAULT_CATEGORIES.map((category) => category.name);
    const unitSymbols = DEFAULT_UNITS.map((unit) => unit.symbol);

    expect(new Set(categoryNames).size).toBe(categoryNames.length);
    expect(new Set(unitSymbols).size).toBe(unitSymbols.length);
  });

  it("has balanced UMKM template with service revenue and payroll liability", () => {
    const umkmTemplate = AVAILABLE_TEMPLATES.find((template) => template.id === "umkm_balanced");

    expect(umkmTemplate).toBeDefined();

    const accounts = umkmTemplate!.getTemplate();
    const accountCodes = accounts.map((account) => account.code);

    expect(accountCodes).toContain("41100"); // Service Revenue
    expect(accountCodes).toContain("21300"); // Payroll Liability
    expect(accounts.length).toBeGreaterThanOrEqual(25);
  });

  it("includes mixed sample catalog for goods and services", () => {
    const services = DEFAULT_SAMPLE_CATALOG.filter((item) => item.isService);
    const goods = DEFAULT_SAMPLE_CATALOG.filter((item) => !item.isService);

    expect(DEFAULT_SAMPLE_CATALOG.length).toBeGreaterThanOrEqual(10);
    expect(services.length).toBeGreaterThanOrEqual(3);
    expect(goods.length).toBeGreaterThanOrEqual(5);
  });
});
