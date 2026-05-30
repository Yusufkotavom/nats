'use server';

import { prisma } from '@/lib/prisma';
import { Prisma, DiscountType } from '@/prisma/generated/prisma/client';
import { authorizedAction } from '@/lib/permissions/protected-action';
import { BatchPricingInput, PriceCalculationResult } from './types';
import { SuperJSON } from '@/lib/superjson';
import { getSession } from '@/lib/auth/auth';
import { hasPermission } from '@/lib/permissions/utils';
import { revalidateLocalizedPath } from '@/lib/revalidate-localized-path';

export async function getCategories() {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, 'products.view')
  ) {
    return [];
  }

  const categories = await prisma.category.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { name: 'asc' },
  });
  return categories;
}

export async function getPricingProducts(
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string
) {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, 'products.view')
  ) {
    return {
      products: SuperJSON.serialize([]),
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.ProductWhereInput = {
    companyId: session.activeCompanyId,
    AND: [],
  };

  if (search) {
    (where.AND as unknown as Prisma.ProductWhereInput[]).push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (categoryId && categoryId !== 'ALL') {
    (where.AND as unknown as Prisma.ProductWhereInput[]).push({ categoryId });
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
          orderBy: { priority: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: SuperJSON.serialize(products),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAllPricingProductIds(
  search?: string,
  categoryId?: string
) {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, 'products.view')
  ) {
    return [];
  }

  const where: Prisma.ProductWhereInput = {
    companyId: session.activeCompanyId,
    AND: [],
  };

  if (search) {
    (where.AND as unknown as Prisma.ProductWhereInput[]).push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (categoryId && categoryId !== 'ALL') {
    (where.AND as unknown as Prisma.ProductWhereInput[]).push({ categoryId });
  }

  const products = await prisma.product.findMany({
    where,
    select: { id: true },
  });

  return products.map((p) => p.id);
}

export const updateSinglePrice = authorizedAction(
  'products.edit',
  async (data: { id: string; price: number }) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: 'No active company selected' };
      }
      await updateProductPrice(data.id, data.price, session.activeCompanyId);
      revalidateLocalizedPath('/inventory/pricing');
      return { success: true };
    } catch (error) {
      console.error('Update price error:', error);
      return { success: false, error: 'Failed to update price' };
    }
  }
);

export async function getProductDiscounts(productId: string) {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, 'products.view')
  ) {
    return SuperJSON.serialize([]);
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: session.activeCompanyId },
    include: {
      discounts: {
        orderBy: { priority: 'desc' },
      },
    },
  });
  return SuperJSON.serialize(product?.discounts || []);
}

export const createAndAssignDiscount = authorizedAction(
  'products.edit',
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
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: 'No active company selected' };
      }
      const product = await prisma.product.findFirst({
        where: { id: data.productId, companyId: session.activeCompanyId },
        select: { id: true },
      });
      if (!product) {
        return { success: false, error: 'Product not found in active company' };
      }

      // Create discount and connect to product
      // We check if discount with code exists first
      const existingDiscount = await prisma.discount.findUnique({
        where: { code: data.code },
      });

      if (existingDiscount) {
        // Update existing discount and connect
        const updatedDiscount = await prisma.discount.update({
          where: { id: existingDiscount.id },
          data: {
            description: data.description,
            type: data.type,
            value: data.value,
            startDate: data.startDate,
            endDate: data.endDate,
            minQuantity: data.minQuantity,
            priority: data.priority || 0,
            isActive: true, // Reactivate if it was inactive
          },
        });

        await prisma.product.update({
          where: { id: product.id },
          data: {
            discounts: {
              connect: { id: existingDiscount.id },
            },
          },
        });
        return {
          success: true,
          discount: {
            ...updatedDiscount,
            value: updatedDiscount.value.toNumber(),
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
            connect: { id: product.id },
          },
        },
      });
      revalidateLocalizedPath('/inventory/pricing');
      return {
        success: true,
        discount: {
          ...discount,
          value: discount.value.toNumber(),
        },
      };
    } catch (error) {
      console.error('Create discount error:', error);
      return { success: false, error: 'Failed to create/assign discount' };
    }
  }
);

export const toggleDiscountStatus = authorizedAction(
  'products.edit',
  async (data: { discountId: string; isActive: boolean }) => {
    try {
      await prisma.discount.update({
        where: { id: data.discountId },
        data: { isActive: data.isActive },
      });
      revalidateLocalizedPath('/inventory/pricing');
      return { success: true };
    } catch (error) {
      console.error('Toggle discount status error:', error);
      return { success: false, error: 'Failed to update discount status' };
    }
  }
);

export const removeDiscountFromProduct = authorizedAction(
  'products.edit',
  async (data: { productId: string; discountId: string }) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: 'No active company selected' };
      }
      const product = await prisma.product.findFirst({
        where: { id: data.productId, companyId: session.activeCompanyId },
        select: { id: true },
      });
      if (!product) {
        return { success: false, error: 'Product not found in active company' };
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          discounts: {
            disconnect: { id: data.discountId },
          },
        },
      });
      revalidateLocalizedPath('/inventory/pricing');
      return { success: true };
    } catch (error) {
      console.error('Remove discount error:', error);
      return { success: false, error: 'Failed to remove discount' };
    }
  }
);

// --- Global Discounts ---

export async function getGlobalDiscounts() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, 'products.view')) {
    return SuperJSON.serialize([]);
  }

  const discounts = await prisma.discount.findMany({
    where: {
      products: {
        none: {},
      },
    },
    orderBy: { priority: 'desc' },
  });

  return SuperJSON.serialize(discounts);
}

export const createGlobalDiscount = authorizedAction(
  'products.edit',
  async (data: {
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
      const existing = await prisma.discount.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        return { success: false, error: 'Discount code already exists' };
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
        },
      });
      revalidateLocalizedPath('/inventory/pricing');
      return { success: true, discount: SuperJSON.serialize(discount) };
    } catch (error) {
      console.error('Create global discount error:', error);
      return { success: false, error: 'Failed to create global discount' };
    }
  }
);

export const updateGlobalDiscount = authorizedAction(
  'products.edit',
  async (data: {
    id: string;
    code: string;
    description?: string;
    type: DiscountType;
    value: number;
    startDate: Date;
    endDate?: Date;
    minQuantity?: number;
    priority?: number;
    isActive: boolean;
  }) => {
    try {
      const discount = await prisma.discount.update({
        where: { id: data.id },
        data: {
          code: data.code,
          description: data.description,
          type: data.type,
          value: data.value,
          startDate: data.startDate,
          endDate: data.endDate,
          minQuantity: data.minQuantity,
          priority: data.priority,
          isActive: data.isActive,
        },
      });
      revalidateLocalizedPath('/inventory/pricing');
      return { success: true, discount: SuperJSON.serialize(discount) };
    } catch (error) {
      console.error('Update global discount error:', error);
      return { success: false, error: 'Failed to update discount' };
    }
  }
);

export const deleteGlobalDiscount = authorizedAction(
  'products.edit',
  async (id: string) => {
    try {
      await prisma.discount.delete({
        where: { id },
      });
      revalidateLocalizedPath('/inventory/pricing');
      return { success: true };
    } catch (error) {
      console.error('Delete global discount error:', error);
      return { success: false, error: 'Failed to delete discount' };
    }
  }
);

// --- Internal Helpers ---

export async function previewPriceChanges(input: BatchPricingInput) {
  const session = await getSession();
  if (!session?.activeCompanyId || !hasPermission(session.permissions, 'products.view')) {
    return { changes: [] };
  }

  const where: Prisma.ProductWhereInput = {};
  where.companyId = session.activeCompanyId;

  if (input.scope === 'CATEGORY' && input.categoryId) {
    where.categoryId = input.categoryId;
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      price: true,
      cost: true,
    },
  });

  const changes = products
    .map((p) => {
      let newPrice = p.price.toNumber();
      const currentPrice = newPrice;
      const cost = p.cost.toNumber();

      switch (input.action) {
        case 'PERCENTAGE_INC':
          newPrice = currentPrice * (1 + input.value / 100);
          break;
        case 'PERCENTAGE_DEC':
          newPrice = currentPrice * (1 - input.value / 100);
          break;
        case 'FIXED_AMOUNT_INC':
          newPrice = currentPrice + input.value;
          break;
        case 'FIXED_AMOUNT_DEC':
          newPrice = currentPrice - input.value;
          break;
        case 'COST_MARGIN':
          if (cost > 0) {
            newPrice = cost * (1 + input.value / 100);
          }
          break;
      }

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100;

      if (newPrice !== currentPrice) {
        return {
          id: p.id,
          currentPrice,
          newPrice,
        };
      }
      return null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return { changes };
}

async function batchUpdateProductPrices(
  updates: { id: string; price: number }[],
  companyId: string,
) {
  // Prisma doesn't support bulk update with different values efficiently yet
  // We'll use a transaction of updates
  await prisma.$transaction(
    updates.map((u) =>
      prisma.product.updateMany({
        where: { id: u.id, companyId },
        data: { price: u.price },
      })
    )
  );

  return updates.length;
}

async function updateProductPrice(id: string, price: number, companyId: string) {
  await prisma.product.updateMany({
    where: { id, companyId },
    data: { price },
  });
}

export const applyBatchPricing = authorizedAction(
  'products.edit',
  async (data: BatchPricingInput) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: 'No active company selected' };
      }
      const preview = await previewPriceChanges(data);

      if (preview.changes.length === 0) {
        return { success: true, message: 'No prices to update.' };
      }

      const updates = preview.changes.map((c) => ({
        id: c.id,
        price: c.newPrice,
      }));

      const count = await batchUpdateProductPrices(updates, session.activeCompanyId);

      revalidateLocalizedPath('/inventory/products');

      return { success: true, count, error: '' };
    } catch (error) {
      console.error('Batch pricing error:', error);
      return {
        success: false,
        count: undefined,
        error: 'Failed to apply batch pricing.',
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
          priority: 'desc',
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
