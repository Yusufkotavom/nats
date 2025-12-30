"use server";

import { prisma, serializePrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma, DiscountType } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { BatchPricingInput, PriceCalculationResult } from "./types";

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
    products: serializePrisma(products),
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
            value: existingDiscount.value.toNumber(),
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
          value: discount.value.toNumber(),
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
    const currentPrice = p.price.toNumber();
    const cost = p.cost.toNumber();
    let newPrice = currentPrice;

    switch (data.action) {
      case "PERCENTAGE_INC":
        newPrice = currentPrice * (1 + data.value / 100);
        break;
      case "PERCENTAGE_DEC":
        newPrice = currentPrice * (1 - data.value / 100);
        break;
      case "COST_MARGIN":
        newPrice = cost + cost * (data.value / 100);
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

    const margin = ((newPrice - cost) / cost) * 100;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      currentPrice,
      newPrice,
      difference: newPrice - currentPrice,
      cost,
      margin,
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

      return { success: true, count, error: "" };
    } catch (error) {
      console.error("Batch pricing error:", error);
      return {
        success: false,
        count: undefined,
        error: "Failed to apply batch pricing.",
      };
    }
  }
);

export async function calculateProductPrice(
  productId: string,
  quantity: number = 1,
  date: Date = new Date()
): Promise<PriceCalculationResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      discounts: {
        where: {
          isActive: true,
          startDate: { lte: date },
          AND: [
            {
              OR: [{ endDate: null }, { endDate: { gte: date } }],
            },
            {
              OR: [{ minQuantity: null }, { minQuantity: { lte: quantity } }],
            },
          ],
        },
        orderBy: {
          priority: "desc",
        },
      },
    },
  });

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  let finalPrice = product.price.toNumber();
  const originalPrice = finalPrice;
  let discountAmount = 0;
  let appliedDiscount = undefined;

  // Apply the highest priority discount
  const discount = product.discounts[0];

  if (discount) {
    const discountValue = discount.value.toNumber();

    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = originalPrice * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }

    // Ensure price doesn't go below 0
    if (discountAmount > originalPrice) {
      discountAmount = originalPrice;
    }

    finalPrice = originalPrice - discountAmount;

    appliedDiscount = {
      code: discount.code,
      description: discount.description,
      value: discountValue,
      type: discount.type,
    };
  }

  return {
    originalPrice,
    finalPrice,
    discountAmount,
    appliedDiscount,
  };
}

export async function updateProductPrice(productId: string, newPrice: number) {
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Update product price
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        price: newPrice,
      },
    });

    // Add to history
    await tx.priceHistory.create({
      data: {
        productId: productId,
        price: newPrice,
        effectiveDate: new Date(),
      },
    });

    return updatedProduct;
  });
}

export async function batchUpdateProductPrices(
  updates: { id: string; price: number }[]
) {
  if (updates.length === 0) return 0;

  return await prisma.$transaction(async (tx) => {
    let count = 0;
    const now = new Date();

    for (const update of updates) {
      const product = await tx.product.findUnique({
        where: { id: update.id },
        select: { price: true },
      });

      if (!product) continue;

      const oldPrice = product.price.toNumber();
      const newPrice = update.price;

      if (oldPrice !== newPrice) {
        await tx.product.update({
          where: { id: update.id },
          data: { price: newPrice },
        });

        await tx.priceHistory.create({
          data: {
            productId: update.id,
            price: newPrice,
            effectiveDate: now,
          },
        });
        count++;
      }
    }
    return count;
  });
}
