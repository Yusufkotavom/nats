import { describe, expect, it } from "vitest";

import { getNavigationBySection } from "./index";

describe("services navigation plugin", () => {
  it("is hidden from sidebar navigation", () => {
    const operationItems = getNavigationBySection()["Operations"];
    const servicesNav = operationItems.find((item) => item.title === "Navigation.services");

    expect(servicesNav).toBeUndefined();
  });
});
