"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";

export async function getCategories(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.CategoryWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.CategoryWhereInput[]).push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
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
      const category = await prisma.category.create({
        data,
      });
      revalidatePath("/inventory/categories");
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
      const category = await prisma.category.update({
        where: { id },
        data,
      });
      revalidatePath("/inventory/categories");
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
      await prisma.category.delete({
        where: { id },
      });
      revalidatePath("/inventory/categories");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete category:", error);
      return { success: false, error: "Failed to delete category" };
    }
  }
);
