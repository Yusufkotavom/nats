import { describe, expect, it } from "vitest";

import { getNavigationBySection } from "./index";

describe("pos navigation plugin", () => {
  it("includes standalone services route in Operations sidebar", () => {
    const operationItems = getNavigationBySection()["Operations"];
    const posNav = operationItems.find((item) => item.title === "Navigation.pos");

    expect(posNav).toBeDefined();
    expect(posNav?.items?.map((item) => item.url)).toContain("/services");
  });
});
