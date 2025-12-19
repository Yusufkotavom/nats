"use server";

import { prisma } from "@/lib/prisma";
import { Product } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
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

export async function getProducts() {
  return await prisma.product.findMany({
    include: {
      category: true,
      inventory: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(data: ProductFormData) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        description: data.description,
        categoryId: data.categoryId,
        price: new Decimal(data.price),
        cost: new Decimal(data.cost),
        minStock: data.minStock,
        isActive: data.isActive,
      },
    });
    revalidatePath("/inventory/products");
    return {
      success: true,
      data: {
        ...product,
        price: new Decimal(product.price),
        cost: new Decimal(product.cost),
      },
    };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(id: string, data: ProductFormData) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku,
        description: data.description,
        categoryId: data.categoryId,
        price: new Decimal(data.price),
        cost: new Decimal(data.cost),
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

export async function deleteProduct(id: string) {
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
