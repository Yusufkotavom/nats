"use server";

import { prisma } from "@/lib/prisma";
import { batchUpdateProductPrices } from "@/lib/pricing-service";
import { revalidatePath } from "next/cache";
import { Prisma, DiscountType } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";

import { updateProductPrice } from "@/lib/pricing-service";

export type PricingScope = "ALL" | "CATEGORY";
export type PricingAction =
  | "PERCENTAGE_INC"
  | "PERCENTAGE_DEC"
  | "COST_MARGIN"
  | "FIXED_AMOUNT_INC"
  | "FIXED_AMOUNT_DEC";

export interface BatchPricingInput {
  scope: PricingScope;
  categoryId?: string;
  action: PricingAction;
  value: number;
}

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getPricingProducts(
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
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        cost: true,
        category: {
          select: { name: true },
        },
        discounts: {
          where: { isActive: true },
          orderBy: { priority: "desc" },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      price: Number(p.price),
      cost: Number(p.cost),
      discounts: p.discounts.map((d) => ({
        id: d.id,
        code: d.code,
        description: d.description,
        type: d.type,
        value: Number(d.value),
        startDate: d.startDate,
        endDate: d.endDate,
        isActive: d.isActive,
        minQuantity: d.minQuantity,
        priority: d.priority,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export const updateSinglePrice = authorizedAction(
  "products.edit",
  async (data: { id: string; price: number }) => {
    try {
      await updateProductPrice(data.id, data.price);
      revalidatePath("/inventory/pricing");
      return { success: true };
    } catch (error) {
      console.error("Update price error:", error);
      return { success: false, error: "Failed to update price" };
    }
  }
);

export async function getProductDiscounts(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      discounts: {
        orderBy: { priority: "desc" },
      },
    },
  });
  return product?.discounts || [];
}

export const createAndAssignDiscount = authorizedAction(
  "products.edit",
  async (data: {
    productId: string;
    code: string;
    description?: string;
    type: DiscountType;
    value: number;
    startDate: Date;
    endDate?: Date;
    minQuantity?: number;
    priority?: number;
  }) => {
    try {
      // Create discount and connect to product
      // We check if discount with code exists first
      const existingDiscount = await prisma.discount.findUnique({
        where: { code: data.code },
      });

      if (existingDiscount) {
        // Connect existing
        await prisma.product.update({
          where: { id: data.productId },
          data: {
            discounts: {
              connect: { id: existingDiscount.id },
            },
          },
        });
        return {
          success: true,
          discount: {
            ...existingDiscount,
            value: Number(existingDiscount.value),
          },
        };
      }

      const discount = await prisma.discount.create({
        data: {
          code: data.code,
          description: data.description,
          type: data.type,
          value: data.value,
          startDate: data.startDate,
          endDate: data.endDate,
          minQuantity: data.minQuantity,
          priority: data.priority || 0,
          products: {
            connect: { id: data.productId },
          },
        },
      });
      revalidatePath("/inventory/pricing");
      return {
        success: true,
        discount: {
          ...discount,
          value: Number(discount.value),
        },
      };
    } catch (error) {
      console.error("Create discount error:", error);
      return { success: false, error: "Failed to create/assign discount" };
    }
  }
);

export const removeDiscountFromProduct = authorizedAction(
  "products.edit",
  async (data: { productId: string; discountId: string }) => {
    try {
      await prisma.product.update({
        where: { id: data.productId },
        data: {
          discounts: {
            disconnect: { id: data.discountId },
          },
        },
      });
      revalidatePath("/inventory/pricing");
      return { success: true };
    } catch (error) {
      console.error("Remove discount error:", error);
      return { success: false, error: "Failed to remove discount" };
    }
  }
);

export async function previewPriceChanges(data: BatchPricingInput) {
  const where: Prisma.ProductWhereInput = {};

  if (data.scope === "CATEGORY" && data.categoryId) {
    where.categoryId = data.categoryId;
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      price: true,
      cost: true,
      sku: true,
    },
  });

  const changes = products.map((p) => {
    const currentPrice = Number(p.price);
    const cost = Number(p.cost);
    let newPrice = currentPrice;

    switch (data.action) {
      case "PERCENTAGE_INC":
        newPrice = currentPrice * (1 + data.value / 100);
        break;
      case "PERCENTAGE_DEC":
        newPrice = currentPrice * (1 - data.value / 100);
        break;
      case "COST_MARGIN":
        newPrice = cost * (1 + data.value / 100);
        break;
      case "FIXED_AMOUNT_INC":
        newPrice = currentPrice + data.value;
        break;
      case "FIXED_AMOUNT_DEC":
        newPrice = currentPrice - data.value;
        break;
    }

    // Round to 2 decimals
    newPrice = Math.round(newPrice * 100) / 100;

    // Ensure not negative
    if (newPrice < 0) newPrice = 0;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      currentPrice,
      newPrice,
      difference: newPrice - currentPrice,
    };
  });

  return {
    totalProducts: products.length,
    changes: changes.filter((c) => c.difference !== 0), // Only show actual changes
  };
}

export const applyBatchPricing = authorizedAction(
  "products.edit",
  async (data: BatchPricingInput) => {
    try {
      const preview = await previewPriceChanges(data);

      if (preview.changes.length === 0) {
        return { success: true, message: "No prices to update." };
      }

      const updates = preview.changes.map((c) => ({
        id: c.id,
        price: c.newPrice,
      }));

      const count = await batchUpdateProductPrices(updates);

      revalidatePath("/inventory/products");

      return { success: true, count };
    } catch (error) {
      console.error("Batch pricing error:", error);
      return { success: false, error: "Failed to apply batch pricing." };
    }
  }
);
