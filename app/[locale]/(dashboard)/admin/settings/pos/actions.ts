"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";

export type POSProductVisibilityMode = "POS_ONLY" | "ALL_ACTIVE";
export type POSFeeLineSetting = {
  id?: string;
  name: string;
  category: "TAX" | "FEE";
  valueType: "PERCENTAGE" | "FIXED";
  value: number;
  sortOrder: number;
  isActive: boolean;
};

export async function getPOSSettings() {
  const [profile, feeSettings] = await Promise.all([
    prisma.companyProfile.findFirst({
      select: {
        id: true,
        posProductVisibilityMode: true,
        posEnableRestaurantFeatures: true,
      },
    }),
    prisma.pOSFeeSetting.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!profile) {
    return {
      id: null,
      posProductVisibilityMode: "POS_ONLY" as POSProductVisibilityMode,
      posEnableRestaurantFeatures: true,
      feeSettings: feeSettings.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category as "TAX" | "FEE",
        valueType: item.valueType as "PERCENTAGE" | "FIXED",
        value: Number(item.value || 0),
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      })),
    };
  }

  return {
    id: profile.id,
    posProductVisibilityMode:
      (profile.posProductVisibilityMode as POSProductVisibilityMode) || "POS_ONLY",
    posEnableRestaurantFeatures: profile.posEnableRestaurantFeatures ?? true,
    feeSettings: feeSettings.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category as "TAX" | "FEE",
      valueType: item.valueType as "PERCENTAGE" | "FIXED",
      value: Number(item.value || 0),
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    })),
  };
}

export const updatePOSSettings = authorizedAction(
  "company.settings",
  async (data: {
    posProductVisibilityMode: POSProductVisibilityMode;
    posEnableRestaurantFeatures: boolean;
    feeSettings: POSFeeLineSetting[];
  }) => {
    if (!data.posProductVisibilityMode) {
      return { success: false, error: "POS visibility mode is required" };
    }

    const normalizedFees = (data.feeSettings || [])
      .map((fee, index) => ({
        ...fee,
        name: fee.name.trim(),
        value: Number(fee.value || 0),
        sortOrder: Number.isFinite(fee.sortOrder) ? fee.sortOrder : index,
      }))
      .filter((fee) => fee.name.length > 0);

    for (const fee of normalizedFees) {
      if (fee.value < 0) {
        return { success: false, error: "POS fee value must be greater than or equal to zero" };
      }
    }

    const existing = await prisma.companyProfile.findFirst();

    if (existing) {
      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: {
          posProductVisibilityMode: data.posProductVisibilityMode,
          posEnableRestaurantFeatures: data.posEnableRestaurantFeatures,
        },
      });
    } else {
      await prisma.companyProfile.create({
        data: {
          name: "Default Company",
          currency: "IDR",
          currencySymbol: "Rp",
          dateFormat: "dd/MM/yyyy",
          currencyFormat: "standard",
          locale: "id-ID",
          timezone: "Asia/Jakarta",
          posProductVisibilityMode: data.posProductVisibilityMode,
          posEnableRestaurantFeatures: data.posEnableRestaurantFeatures,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pOSFeeSetting.deleteMany({});
      if (normalizedFees.length > 0) {
        await tx.pOSFeeSetting.createMany({
          data: normalizedFees.map((fee, index) => ({
            name: fee.name,
            category: fee.category,
            valueType: fee.valueType,
            value: fee.value,
            sortOrder: index,
            isActive: fee.isActive,
          })),
        });
      }
    });

    revalidatePath("/admin/settings/pos");
    revalidatePath("/pos");
    return { success: true };
  },
);
