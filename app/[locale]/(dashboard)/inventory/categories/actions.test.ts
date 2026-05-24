import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  category: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
}));

vi.mock("@/lib/permissions/protected-action", () => ({
  authorizedAction: (_permission: string, fn: (...args: any[]) => any) => fn,
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: vi.fn(() => true),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "./actions";

describe("inventory/categories actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({
      userId: "u-1",
      activeCompanyId: "company-1",
      permissions: ["products.view", "categories.create", "categories.edit", "categories.delete"],
    });

    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.category.count.mockResolvedValue(0);
    prismaMock.category.create.mockResolvedValue({ id: "cat-1", name: "Snack" });
    prismaMock.category.findFirst.mockResolvedValue({ id: "cat-1" });
    prismaMock.category.update.mockResolvedValue({ id: "cat-1", name: "Updated" });
    prismaMock.category.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("scopes category listing to active company", async () => {
    await getCategories(1, 10, "snack");

    expect(prismaMock.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
        }),
      }),
    );
  });

  it("creates category with active company id", async () => {
    await createCategory({ name: "Snack" });

    expect(prismaMock.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Snack",
          companyId: "company-1",
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/inventory/categories");
  });

  it("updates only category within active company", async () => {
    await updateCategory("cat-1", { name: "Updated" });

    expect(prismaMock.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat-1", companyId: "company-1" },
      }),
    );
    expect(prismaMock.category.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat-1" },
      }),
    );
  });

  it("deletes category only inside active company", async () => {
    await deleteCategory("cat-1");

    expect(prismaMock.category.deleteMany).toHaveBeenCalledWith({
      where: { id: "cat-1", companyId: "company-1" },
    });
  });
});
