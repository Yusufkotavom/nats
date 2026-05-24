import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const setImpersonationContextMock = vi.hoisted(() => vi.fn());
const clearImpersonationContextMock = vi.hoisted(() => vi.fn());
const switchActiveCompanyContextMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  company: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  companyMembership: {
    findMany: vi.fn(),
  },
  companyImpersonationAudit: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: getSessionMock,
  setImpersonationContext: (...args: unknown[]) => setImpersonationContextMock(...args),
  clearImpersonationContext: (...args: unknown[]) => clearImpersonationContextMock(...args),
  switchActiveCompanyContext: (...args: unknown[]) => switchActiveCompanyContextMock(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import {
  getCompaniesForPlatformAdmin,
  getMyCompanyMemberships,
  startCompanyImpersonation,
  switchMyActiveCompany,
} from "./actions";

describe("admin/companies actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for non superadmin on platform companies listing", async () => {
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      isPlatformSuperAdmin: false,
    });

    await expect(getCompaniesForPlatformAdmin()).rejects.toThrow(
      "Forbidden: platform super admin only",
    );
  });

  it("filters memberships to active company only", async () => {
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      isPlatformSuperAdmin: false,
    });
    prismaMock.companyMembership.findMany.mockResolvedValue([
      {
        isDefault: true,
        company: { id: "c-1", name: "Active Co", status: "ACTIVE" },
      },
      {
        isDefault: false,
        company: { id: "c-2", name: "Suspended Co", status: "SUSPENDED" },
      },
    ]);

    const rows = await getMyCompanyMemberships();

    expect(rows).toEqual([
      {
        companyId: "c-1",
        companyName: "Active Co",
        isDefault: true,
      },
    ]);
  });

  it("prevents impersonation for suspended company", async () => {
    getSessionMock.mockResolvedValue({
      userId: "sa-1",
      isPlatformSuperAdmin: true,
    });
    prismaMock.company.findUnique.mockResolvedValue({
      id: "c-2",
      status: "SUSPENDED",
    });

    const result = await startCompanyImpersonation("c-2");

    expect(result).toEqual({
      success: false,
      error: "Company is not active",
    });
    expect(setImpersonationContextMock).not.toHaveBeenCalled();
  });

  it("switches active company context and revalidates layout", async () => {
    switchActiveCompanyContextMock.mockResolvedValue(undefined);

    const result = await switchMyActiveCompany("c-1");

    expect(result).toEqual({ success: true });
    expect(switchActiveCompanyContextMock).toHaveBeenCalledWith("c-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });
});
