import { describe, expect, it } from "vitest";
import {
  AVAILABLE_TEMPLATES,
  DEFAULT_CATEGORIES,
  DEFAULT_SAMPLE_CATALOG,
  DEFAULT_UNITS,
} from "./chart-of-accounts-template";

describe("setup defaults", () => {
  it("uses minimal default categories", () => {
    const names = DEFAULT_CATEGORIES.map((category) => category.name);

    expect(names).toEqual(["Product", "Service"]);
  });

  it("uses only PCS as default unit", () => {
    const symbols = DEFAULT_UNITS.map((unit) => unit.symbol);
    expect(symbols).toEqual(["PCS"]);
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

  it("keeps starter sample catalog minimal: 1 good + 1 service", () => {
    const services = DEFAULT_SAMPLE_CATALOG.filter((item) => item.isService);
    const goods = DEFAULT_SAMPLE_CATALOG.filter((item) => !item.isService);

    expect(DEFAULT_SAMPLE_CATALOG.length).toBe(2);
    expect(services.length).toBe(1);
    expect(goods.length).toBe(1);
  });
});
