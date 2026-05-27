"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { Prisma } from "@/prisma/generated/prisma/client";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

export async function getCategories(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, "products.view")
  ) {
    return {
      categories: [],
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.CategoryWhereInput = {
    companyId: session.activeCompanyId,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.category.count({ where }),
  ]);

  return {
    categories,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

import { authorizedAction } from "@/lib/permissions/protected-action";

export const createCategory = authorizedAction(
  "categories.create",
  async (data: { name: string; description?: string }) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: "No active company selected" };
      }

      const category = await prisma.category.create({
        data: {
          ...data,
          companyId: session.activeCompanyId,
        },
      });
      revalidateLocalizedPath("/inventory/categories");
      return { success: true, data: category };
    } catch (error) {
      console.error("Failed to create category:", error);
      return { success: false, error: "Failed to create category" };
    }
  }
);

export const updateCategory = authorizedAction(
  "categories.edit",
  async (id: string, data: { name: string; description?: string }) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: "No active company selected" };
      }

      const existing = await prisma.category.findFirst({
        where: { id, companyId: session.activeCompanyId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, error: "Category not found in active company" };
      }

      const category = await prisma.category.update({
        where: { id: existing.id },
        data,
      });
      revalidateLocalizedPath("/inventory/categories");
      return { success: true, data: category };
    } catch (error) {
      console.error("Failed to update category:", error);
      return { success: false, error: "Failed to update category" };
    }
  }
);

export const deleteCategory = authorizedAction(
  "categories.delete",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: "No active company selected" };
      }

      const deleted = await prisma.category.deleteMany({
        where: { id, companyId: session.activeCompanyId },
      });
      if (deleted.count === 0) {
        return { success: false, error: "Category not found in active company" };
      }

      revalidateLocalizedPath("/inventory/categories");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete category:", error);
      return { success: false, error: "Failed to delete category" };
    }
  }
);
