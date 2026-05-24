"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { requireActiveCompanyContext } from "@/lib/company-context";

export type POSProductVisibilityMode = "POS_ONLY" | "ALL_ACTIVE";
export type ServiceWarrantyUnit = "DAY" | "MONTH";
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
  const { companyId } = await requireActiveCompanyContext();
  const [profile, feeSettings] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { companyId },
      select: {
        id: true,
        posProductVisibilityMode: true,
        posEnableRestaurantFeatures: true,
        serviceNotifyOnCreated: true,
        serviceNotifyOnReady: true,
        serviceNotifyOnCostDone: true,
        serviceNotifyOnPickedUp: true,
        serviceTemplateCreated: true,
        serviceTemplateReady: true,
        serviceTemplateCostDone: true,
        serviceTemplatePickedUp: true,
        serviceWarrantyDuration: true,
        serviceWarrantyUnit: true,
      },
    }),
    prisma.pOSFeeSetting.findMany({
      where: {
        OR: [{ companyId }, { companyId: null }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!profile) {
    return {
      id: null,
      posProductVisibilityMode: "POS_ONLY" as POSProductVisibilityMode,
      posEnableRestaurantFeatures: true,
      serviceNotifyOnCreated: true,
      serviceNotifyOnReady: true,
      serviceNotifyOnCostDone: true,
      serviceNotifyOnPickedUp: true,
      serviceTemplateCreated: "",
      serviceTemplateReady: "",
      serviceTemplateCostDone: "",
      serviceTemplatePickedUp: "",
      serviceWarrantyDuration: 0,
      serviceWarrantyUnit: "DAY" as ServiceWarrantyUnit,
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
    serviceNotifyOnCreated: profile.serviceNotifyOnCreated ?? true,
    serviceNotifyOnReady: profile.serviceNotifyOnReady ?? true,
    serviceNotifyOnCostDone: profile.serviceNotifyOnCostDone ?? true,
    serviceNotifyOnPickedUp: profile.serviceNotifyOnPickedUp ?? true,
    serviceTemplateCreated: profile.serviceTemplateCreated || "",
    serviceTemplateReady: profile.serviceTemplateReady || "",
    serviceTemplateCostDone: profile.serviceTemplateCostDone || "",
    serviceTemplatePickedUp: profile.serviceTemplatePickedUp || "",
    serviceWarrantyDuration: profile.serviceWarrantyDuration ?? 0,
    serviceWarrantyUnit: (profile.serviceWarrantyUnit as ServiceWarrantyUnit) || "DAY",
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
    serviceNotifyOnCreated: boolean;
    serviceNotifyOnReady: boolean;
    serviceNotifyOnCostDone: boolean;
    serviceNotifyOnPickedUp: boolean;
    serviceTemplateCreated?: string;
    serviceTemplateReady?: string;
    serviceTemplateCostDone?: string;
    serviceTemplatePickedUp?: string;
    serviceWarrantyDuration: number;
    serviceWarrantyUnit: ServiceWarrantyUnit;
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

    if (data.serviceWarrantyDuration < 0) {
      return { success: false, error: "Service warranty duration must be greater than or equal to zero" };
    }

    const { companyId } = await requireActiveCompanyContext();
    const existing = await prisma.companyProfile.findUnique({
      where: { companyId },
    });

    if (existing) {
      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: {
          posProductVisibilityMode: data.posProductVisibilityMode,
          posEnableRestaurantFeatures: data.posEnableRestaurantFeatures,
          serviceNotifyOnCreated: data.serviceNotifyOnCreated,
          serviceNotifyOnReady: data.serviceNotifyOnReady,
          serviceNotifyOnCostDone: data.serviceNotifyOnCostDone,
          serviceNotifyOnPickedUp: data.serviceNotifyOnPickedUp,
          serviceTemplateCreated: data.serviceTemplateCreated?.trim() || null,
          serviceTemplateReady: data.serviceTemplateReady?.trim() || null,
          serviceTemplateCostDone: data.serviceTemplateCostDone?.trim() || null,
          serviceTemplatePickedUp: data.serviceTemplatePickedUp?.trim() || null,
          serviceWarrantyDuration: Math.floor(data.serviceWarrantyDuration || 0),
          serviceWarrantyUnit: data.serviceWarrantyUnit,
        },
      });
    } else {
      await prisma.companyProfile.create({
        data: {
          companyId,
          name: "Default Company",
          currency: "IDR",
          currencySymbol: "Rp",
          dateFormat: "dd/MM/yyyy",
          currencyFormat: "standard",
          locale: "id-ID",
          timezone: "Asia/Jakarta",
          posProductVisibilityMode: data.posProductVisibilityMode,
          posEnableRestaurantFeatures: data.posEnableRestaurantFeatures,
          serviceNotifyOnCreated: data.serviceNotifyOnCreated,
          serviceNotifyOnReady: data.serviceNotifyOnReady,
          serviceNotifyOnCostDone: data.serviceNotifyOnCostDone,
          serviceNotifyOnPickedUp: data.serviceNotifyOnPickedUp,
          serviceTemplateCreated: data.serviceTemplateCreated?.trim() || null,
          serviceTemplateReady: data.serviceTemplateReady?.trim() || null,
          serviceTemplateCostDone: data.serviceTemplateCostDone?.trim() || null,
          serviceTemplatePickedUp: data.serviceTemplatePickedUp?.trim() || null,
          serviceWarrantyDuration: Math.floor(data.serviceWarrantyDuration || 0),
          serviceWarrantyUnit: data.serviceWarrantyUnit,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pOSFeeSetting.deleteMany({
        where: { companyId },
      });
      if (normalizedFees.length > 0) {
        await tx.pOSFeeSetting.createMany({
          data: normalizedFees.map((fee, index) => ({
            companyId,
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
