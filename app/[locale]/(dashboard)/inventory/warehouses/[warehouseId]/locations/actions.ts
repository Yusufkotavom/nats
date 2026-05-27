"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { LocationType } from "@/prisma/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { SuperJSON } from "@/lib/superjson";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

export async function getLocations(
  warehouseId: string,
  page: number = 1,
  limit: number = 10
) {
  const session = await getSession();
  if (
    !session ||
    !session.activeCompanyId ||
    !hasPermission(session.permissions, "inventory.view")
  ) {
    return {
      locations: [],
      total: 0,
    };
  }

  const skip = (page - 1) * limit;

  const [locations, total] = await Promise.all([
    prisma.location.findMany({
      where: {
        warehouseId,
        warehouse: { companyId: session.activeCompanyId },
      },
      orderBy: { code: "asc" },
      skip,
      take: limit,
    }),
    prisma.location.count({
      where: {
        warehouseId,
        warehouse: { companyId: session.activeCompanyId },
      },
    }),
  ]);

  return {
    locations: SuperJSON.serialize(locations),
    total,
  };
}

export async function getWarehouse(warehouseId: string) {
    const session = await getSession();
    if (
      !session ||
      !session.activeCompanyId ||
      !hasPermission(session.permissions, "inventory.view")
    ) {
      return null;
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId: session.activeCompanyId },
    });
    return SuperJSON.serialize(warehouse);
}

export const createLocation = authorizedAction(
  "warehouses.edit",
  async (data: { warehouseId: string; name: string; code: string; type: LocationType }) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: "No active company selected" };
      }

      const warehouse = await prisma.warehouse.findFirst({
        where: { id: data.warehouseId, companyId: session.activeCompanyId },
        select: { id: true },
      });
      if (!warehouse) {
        return { success: false, error: "Warehouse not found in active company" };
      }

      const location = await prisma.location.create({
        data,
      });
      revalidateLocalizedPath(`/inventory/warehouses/${data.warehouseId}/locations`);
      return { success: true, data: location };
    } catch (error) {
      console.error("Failed to create location:", error);
      return { success: false, error: "Failed to create location" };
    }
  }
);

export const updateLocation = authorizedAction(
  "warehouses.edit",
  async (id: string, data: { name: string; code: string; type: LocationType }) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: "No active company selected" };
      }

      const existing = await prisma.location.findFirst({
        where: {
          id,
          warehouse: { companyId: session.activeCompanyId },
        },
        select: { id: true, warehouseId: true },
      });
      if (!existing) {
        return { success: false, error: "Location not found in active company" };
      }

      const location = await prisma.location.update({
        where: { id: existing.id },
        data,
      });
      revalidateLocalizedPath(`/inventory/warehouses/${location.warehouseId}/locations`);
      return { success: true, data: location };
    } catch (error) {
      console.error("Failed to update location:", error);
      return { success: false, error: "Failed to update location" };
    }
  }
);

export const deleteLocation = authorizedAction(
  "warehouses.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session?.activeCompanyId) {
        return { success: false, error: "No active company selected" };
      }

      const existing = await prisma.location.findFirst({
        where: {
          id,
          warehouse: { companyId: session.activeCompanyId },
        },
        select: { id: true, warehouseId: true },
      });
      if (!existing) {
        return { success: false, error: "Location not found in active company" };
      }

      const location = await prisma.location.delete({
        where: { id: existing.id },
      });
      revalidateLocalizedPath(`/inventory/warehouses/${location.warehouseId}/locations`);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete location:", error);
      return { success: false, error: "Failed to delete location" };
    }
  }
);
