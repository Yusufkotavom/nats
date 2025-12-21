"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  return await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
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
