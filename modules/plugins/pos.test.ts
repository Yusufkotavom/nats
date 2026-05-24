import { describe, expect, it } from "vitest";

import { getNavigationBySection } from "./index";

describe("pos navigation plugin", () => {
  it("keeps cashier/sessions/dining-spots under POS group", () => {
    const operationItems = getNavigationBySection()["Operations"];
    const posNav = operationItems.find((item) => item.title === "Navigation.pos");

    expect(posNav).toBeDefined();
    const urls = posNav?.items?.map((item) => item.url) || [];
    expect(urls).toContain("/pos");
    expect(urls).toContain("/pos/sessions");
    expect(urls).toContain("/pos/dining-spots");
    expect(urls).not.toContain("/services");
  });
});
