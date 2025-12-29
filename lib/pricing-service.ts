import { prisma } from "@/lib/prisma";
import { DiscountType } from "@/prisma/generated/prisma/client";

export type PriceCalculationResult = {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  appliedDiscount?: {
    code: string;
    description?: string | null;
    value: number;
    type: DiscountType;
  };
};

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

  let finalPrice = Number(product.price);
  const originalPrice = finalPrice;
  let discountAmount = 0;
  let appliedDiscount = undefined;

  // Apply the highest priority discount
  const discount = product.discounts[0];

  if (discount) {
    const discountValue = Number(discount.value);

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

      const oldPrice = Number(product.price);
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
