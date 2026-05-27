import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn(() => true));

const prismaMock = vi.hoisted(() => ({
  pOSServiceOrder: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  contact: {
    findMany: vi.fn(),
  },
  salesInvoice: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/services/services/pos-service-workflow.service", () => ({
  POSServiceWorkflowService: {},
}));

vi.mock("@/modules/sales/services/sales-return.service", () => ({
  SalesReturnService: {},
}));

import { getServiceOrders } from "./actions";

describe("services actions tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "cmp-1",
      permissions: ["pos.access"],
    });

    prismaMock.pOSServiceOrder.findMany.mockResolvedValue([]);
    prismaMock.pOSServiceOrder.count.mockResolvedValue(0);
    prismaMock.contact.findMany.mockResolvedValue([]);
    prismaMock.salesInvoice.findMany.mockResolvedValue([]);
  });

  it("scopes service order listing to active company", async () => {
    await getServiceOrders(1, 10, "SO", "ALL");

    expect(prismaMock.pOSServiceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: "cmp-1" }),
      }),
    );
  });
});
