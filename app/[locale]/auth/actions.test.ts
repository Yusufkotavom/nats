import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn());
const resolveUserCompanyContextMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $disconnect: vi.fn(),
  $connect: vi.fn(),
}));

const compareMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => compareMock(...args),
  hash: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createSession: (...args: unknown[]) => createSessionMock(...args),
  deleteSession: vi.fn(),
  resolveUserCompanyContext: (...args: unknown[]) =>
    resolveUserCompanyContextMock(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { login } from "./actions";

describe("auth/actions login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$disconnect.mockResolvedValue(undefined);
    prismaMock.$connect.mockResolvedValue(undefined);
    createSessionMock.mockResolvedValue(undefined);
    resolveUserCompanyContextMock.mockResolvedValue({
      activeCompanyId: "cmp-1",
    });
  });

  it("returns timeout message when db connection times out", async () => {
    prismaMock.user.findUnique.mockRejectedValue({ code: "ETIMEDOUT" });

    const formData = new FormData();
    formData.set("email", "platform@example.com");
    formData.set("password", "password123");

    const result = await login(undefined, formData);

    expect(result).toEqual({
      errors: {
        email: [
          "Koneksi database timeout. Coba lagi 10-20 detik, lalu restart server jika perlu.",
        ],
      },
    });
  });

  it("creates session and redirects dashboard on valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "usr-1",
      email: "platform@example.com",
      password: "hash",
      name: "Platform Super Admin",
      roleId: "role-superadmin",
    });
    compareMock.mockResolvedValue(true);
    prismaMock.role.findUnique.mockResolvedValue({
      id: "role-superadmin",
      name: "superadmin",
      isActive: true,
      permissions: ["*"],
    });

    const formData = new FormData();
    formData.set("email", "platform@example.com");
    formData.set("password", "password123");

    await login(undefined, formData);

    expect(createSessionMock).toHaveBeenCalledWith(
      "usr-1",
      "Platform Super Admin",
      expect.objectContaining({ name: "superadmin" }),
      expect.objectContaining({
        activeCompanyId: "cmp-1",
        isPlatformSuperAdmin: true,
      }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
