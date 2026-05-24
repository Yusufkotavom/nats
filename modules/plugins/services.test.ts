import { describe, expect, it } from "vitest";

import { getNavigationBySection } from "./index";

describe("services navigation plugin", () => {
  it("exposes standalone services module with order/invoice/payment/returns entries", () => {
    const operationItems = getNavigationBySection()["Operations"];
    const servicesNav = operationItems.find((item) => item.title === "Navigation.services");

    expect(servicesNav).toBeDefined();
    const urls = servicesNav?.items?.map((item) => item.url) || [];
    expect(urls).toContain("/services/orders");
    expect(urls).toContain("/services/invoices");
    expect(urls).toContain("/services/payments");
    expect(urls).toContain("/services/returns-warranty");
  });
});
