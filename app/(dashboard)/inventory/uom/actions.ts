"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { revalidatePath } from "next/cache";

export async function getUnits(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const [units, total] = await Promise.all([
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.unit.count(),
  ]);

  return {
    units,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export const createUnit = authorizedAction(
  "inventory_products.create", // Reusing product permission for now
  async (data: { name: string; symbol: string }) => {
    try {
      const unit = await prisma.unit.create({
        data,
      });
      revalidatePath("/inventory/uom");
      return { success: true, data: unit };
    } catch (error) {
      console.error("Failed to create unit:", error);
      return { success: false, error: "Failed to create unit. Symbol or Name might already exist." };
    }
  }
);

export const updateUnit = authorizedAction(
  "inventory_products.edit",
  async (id: string, data: { name: string; symbol: string }) => {
    try {
      const unit = await prisma.unit.update({
        where: { id },
        data,
      });
      revalidatePath("/inventory/uom");
      return { success: true, data: unit };
    } catch (error) {
      console.error("Failed to update unit:", error);
      return { success: false, error: "Failed to update unit" };
    }
  }
);

export const deleteUnit = authorizedAction(
  "inventory_products.delete",
  async (id: string) => {
    try {
      // Check usage first
      const usageCount = await prisma.product.count({
        where: {
            OR: [
                { baseUnitId: id },
                { purchaseUnitId: id },
                { salesUnitId: id }
            ]
        }
      });

      if (usageCount > 0) {
        return { success: false, error: "Cannot delete unit because it is used by products." };
      }

      await prisma.unit.delete({
        where: { id },
      });
      revalidatePath("/inventory/uom");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete unit:", error);
      return { success: false, error: "Failed to delete unit" };
    }
  }
);
