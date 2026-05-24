import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ServicesPage from "./page";

const redirectSpy = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectSpy(...args),
}));

describe("dashboard/services page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /services root to /services/orders", async () => {
    const ui = ServicesPage();
    render(ui);
    expect(redirectSpy).toHaveBeenCalledWith("/services/orders");
  });
});
