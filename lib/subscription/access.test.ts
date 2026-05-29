import { describe, expect, it, vi, beforeEach } from "vitest";
import { CompanySubscriptionStatus } from "@/prisma/generated/prisma/client";

const prismaMock = vi.hoisted(() => ({
  companySubscription: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { getCompanyAccessState } from "./access";

describe("subscription access state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks company read-only when no subscription", async () => {
    prismaMock.companySubscription.findUnique.mockResolvedValue(null);

    const result = await getCompanyAccessState("cmp-1");

    expect(result.isReadOnly).toBe(true);
    expect(result.reason).toBe("NO_SUBSCRIPTION");
  });

  it("allows write during active trial", async () => {
    const trialEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    prismaMock.companySubscription.findUnique.mockResolvedValue({
      status: CompanySubscriptionStatus.TRIAL,
      endDate: trialEnd,
    });

    const result = await getCompanyAccessState("cmp-1");

    expect(result.isReadOnly).toBe(false);
    expect(result.reason).toBe("OK");
  });

  it("marks read-only when trial expired", async () => {
    const trialEnd = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prismaMock.companySubscription.findUnique.mockResolvedValue({
      status: CompanySubscriptionStatus.TRIAL,
      endDate: trialEnd,
    });

    const result = await getCompanyAccessState("cmp-1");

    expect(result.isReadOnly).toBe(true);
    expect(result.reason).toBe("TRIAL_ENDED");
  });
});
