import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
  company: { create: vi.fn() },
  companyProfile: { create: vi.fn() },
  user: { create: vi.fn() },
  companyMembership: { create: vi.fn() },
  companySubscription: { create: vi.fn() },
  contact: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  role: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/lib/auth/auth", () => ({
  createSession: (...args: unknown[]) => createSessionMock(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { registerUserAndTenant } from "./actions";

describe("register/actions registerUserAndTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.upsert.mockResolvedValue({
      id: "role-company-admin",
      name: "company_admin",
    });
    createSessionMock.mockResolvedValue(undefined);

    txMock.company.create.mockResolvedValue({ id: "company-1" });
    txMock.companyProfile.create.mockResolvedValue({ id: "profile-1" });
    txMock.user.create.mockResolvedValue({ id: "user-1" });
    txMock.companyMembership.create.mockResolvedValue({ id: "membership-1" });
    txMock.companySubscription.create.mockResolvedValue({ id: "sub-1" });
    txMock.contact.findMany.mockResolvedValue([]);
    txMock.contact.createMany.mockResolvedValue({ count: 3 });

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
      cb(txMock),
    );
  });

  it("upserts company_admin role and creates company + membership on signup", async () => {
    const formData = new FormData();
    formData.set("fullName", "Tenant Owner");
    formData.set("email", "owner@example.com");
    formData.set("password", "password-123");
    formData.set("companyName", "Acme Laundry");

    await registerUserAndTenant(undefined, formData);

    expect(prismaMock.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "company_admin" },
        update: expect.objectContaining({
          isActive: true,
          permissions: ["*"],
        }),
      }),
    );
    expect(txMock.company.create).toHaveBeenCalled();
    expect(txMock.companyProfile.create).not.toHaveBeenCalled();
    expect(txMock.companyMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDefault: true,
        }),
      }),
    );
    expect(txMock.contact.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ type: "CUSTOMER", name: "Walk-in Customer" }),
          expect.objectContaining({ type: "VENDOR", name: "General Vendor" }),
          expect.objectContaining({ type: "EMPLOYEE", name: "General Employee" }),
        ]),
      }),
    );
    expect(createSessionMock).toHaveBeenCalledWith(
      "user-1",
      expect.any(String),
      expect.objectContaining({ name: "company_admin" }),
      expect.objectContaining({
        activeCompanyId: "company-1",
        isPlatformSuperAdmin: false,
      }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/setup");
  });
});
