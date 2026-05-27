import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "id"],
  },
}));

import { revalidateLocalizedPath, revalidateLocalizedPaths } from "./revalidate-localized-path";

describe("revalidate-localized-path", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
  });

  it("revalidates base path and all locale-prefixed variants", () => {
    revalidateLocalizedPath("/sales/orders");

    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/sales/orders");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/en/sales/orders");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/id/sales/orders");
  });

  it("normalizes path without leading slash", () => {
    revalidateLocalizedPath("purchase/payments");

    expect(revalidatePathMock).toHaveBeenCalledWith("/purchase/payments");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/purchase/payments");
    expect(revalidatePathMock).toHaveBeenCalledWith("/id/purchase/payments");
  });

  it("revalidates multiple paths with helper", () => {
    revalidateLocalizedPaths(["/services/orders", "/services/invoices"]);

    expect(revalidatePathMock).toHaveBeenCalledTimes(6);
  });
});
