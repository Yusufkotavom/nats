"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { ProductFormData } from "../types";

// Categories

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCategory(data: {
  name: string;
  description?: string;
}) {
  try {
    const category = await prisma.category.create({
      data,
    });
    revalidatePath("/inventory/products");
    return { success: true, data: category };
  } catch (error) {
    console.error("Failed to create category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

// Products

export async function getProducts(
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string
) {
  const skip = (page - 1) * limit;
  const where: Prisma.ProductWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as Prisma.ProductWhereInput[]).push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (categoryId && categoryId !== "ALL") {
    (where.AND as Prisma.ProductWhereInput[]).push({ categoryId });
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

import { authorizedAction } from "@/lib/permissions/protected-action";

export const createProduct = authorizedAction(
  "products.create",
  async (data: ProductFormData) => {
    try {
      const product = await prisma.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          description: data.description,
          categoryId: data.categoryId,
          price: Number(data.price),
          cost: Number(data.cost),
          minStock: data.minStock,
          isActive: data.isActive,
        },
      });
      revalidatePath("/inventory/products");
      return {
        success: true,
        data: {
          ...product,
          price: Number(product.price),
          cost: Number(product.cost),
        },
      };
    } catch (error) {
      console.error("Failed to create product:", error);
      return { success: false, error: "Failed to create product" };
    }
  }
);

export const updateProduct = authorizedAction(
  "products.edit",
  async (id: string, data: ProductFormData) => {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          sku: data.sku,
          description: data.description,
          categoryId: data.categoryId,
          price: Number(data.price),
          cost: Number(data.cost),
          minStock: data.minStock,
          isActive: data.isActive,
        },
      });
      revalidatePath("/inventory/products");
      return {
        success: true,
        data: {
          ...product,
          price: Number(product.price),
          cost: Number(product.cost),
        },
      };
    } catch (error) {
      console.error("Failed to update product:", error);
      return { success: false, error: "Failed to update product" };
    }
  }
);

export const deleteProduct = authorizedAction(
  "products.delete",
  async (id: string) => {
    try {
      await prisma.product.delete({
        where: { id },
      });
      revalidatePath("/inventory/products");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete product:", error);
      return { success: false, error: "Failed to delete product" };
    }
  }
);
