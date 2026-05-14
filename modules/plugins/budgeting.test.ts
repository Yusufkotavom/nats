import { describe, expect, it } from "vitest";

import { getNavigationBySection } from "./index";

describe("budgeting navigation plugin", () => {
  it("includes saving-targets route in Finance & Accounting sidebar", () => {
    const financeItems = getNavigationBySection()["Finance & Accounting"];
    const budgetingNav = financeItems.find(
      (item) => item.title === "Navigation.budgeting",
    );

    expect(budgetingNav).toBeDefined();
    expect(budgetingNav?.items?.map((item) => item.url)).toContain(
      "/budgeting/saving-targets",
    );
  });
});
