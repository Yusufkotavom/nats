"use server";

import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { requireActiveCompanyContext } from "@/lib/company-context";
import { Prisma } from "@/prisma/generated/prisma/client";

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
  const [feeSettings, cashAccounts] = await Promise.all([
    prisma.pOSFeeSetting.findMany({
      where: {
        OR: [{ companyId }, { companyId: null }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.cashAccount.findMany({
      where: {
        isActive: true,
        glAccount: { companyId },
      },
      select: {
        id: true,
        name: true,
        type: true,
        accountNumber: true,
        bankName: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  let profile: {
    id: string;
    posProductVisibilityMode: string | null;
    posEnableRestaurantFeatures: boolean | null;
    serviceNotifyOnCreated: boolean | null;
    serviceNotifyOnReady: boolean | null;
    serviceNotifyOnCostDone: boolean | null;
    serviceNotifyOnPickedUp: boolean | null;
    serviceTemplateCreated: string | null;
    serviceTemplateReady: string | null;
    serviceTemplateCostDone: string | null;
    serviceTemplatePickedUp: string | null;
    serviceWarrantyDuration: number | null;
    serviceWarrantyUnit: string | null;
    defaultCashAccountId: string | null;
    defaultCardAccountId: string | null;
    defaultQrisAccountId: string | null;
  } | null = null;

  try {
    profile = await prisma.companyProfile.findUnique({
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
        defaultCashAccountId: true,
        defaultCardAccountId: true,
        defaultQrisAccountId: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientValidationError &&
      error.message.includes("defaultCashAccountId")
    ) {
      const legacy = await prisma.companyProfile.findUnique({
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
      });

      profile = legacy
        ? {
            ...legacy,
            defaultCashAccountId: null,
            defaultCardAccountId: null,
            defaultQrisAccountId: null,
          }
        : null;
    } else {
      throw error;
    }
  }

  if (!profile) {
    return {
      id: null,
      posProductVisibilityMode: "POS_ONLY" as POSProductVisibilityMode,
      posEnableRestaurantFeatures: false,
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
      defaultCashAccountId: null,
      defaultCardAccountId: null,
      defaultQrisAccountId: null,
      cashAccounts,
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
    posEnableRestaurantFeatures: profile.posEnableRestaurantFeatures ?? false,
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
    defaultCashAccountId: profile.defaultCashAccountId,
    defaultCardAccountId: profile.defaultCardAccountId,
    defaultQrisAccountId: profile.defaultQrisAccountId,
    cashAccounts,
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
    defaultCashAccountId?: string | null;
    defaultCardAccountId?: string | null;
    defaultQrisAccountId?: string | null;
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
    const requestedAccountIds = [
      data.defaultCashAccountId,
      data.defaultCardAccountId,
      data.defaultQrisAccountId,
    ].filter((id): id is string => Boolean(id));
    if (requestedAccountIds.length > 0) {
      const accountCount = await prisma.cashAccount.count({
        where: {
          id: { in: requestedAccountIds },
          isActive: true,
          glAccount: { companyId },
        },
      });
      if (accountCount !== requestedAccountIds.length) {
        return { success: false, error: "Default payment account must be active and belong to active company" };
      }
    }

    const existing = await prisma.companyProfile.findUnique({
      where: { companyId },
    });

    if (existing) {
      const profileUpdateData: Prisma.CompanyProfileUpdateInput = {
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
      };

      const profileCreateData: Prisma.CompanyProfileCreateInput = {
        company: { connect: { id: companyId } },
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
      };

      try {
        (profileUpdateData as Prisma.CompanyProfileUncheckedUpdateInput).defaultCashAccountId =
          data.defaultCashAccountId || null;
        (profileUpdateData as Prisma.CompanyProfileUncheckedUpdateInput).defaultCardAccountId =
          data.defaultCardAccountId || null;
        (profileUpdateData as Prisma.CompanyProfileUncheckedUpdateInput).defaultQrisAccountId =
          data.defaultQrisAccountId || null;

        (profileCreateData as Prisma.CompanyProfileUncheckedCreateInput).defaultCashAccountId =
          data.defaultCashAccountId || null;
        (profileCreateData as Prisma.CompanyProfileUncheckedCreateInput).defaultCardAccountId =
          data.defaultCardAccountId || null;
        (profileCreateData as Prisma.CompanyProfileUncheckedCreateInput).defaultQrisAccountId =
          data.defaultQrisAccountId || null;
      } catch {
        // Keep backward compatibility when generated Prisma types/client haven't included the new fields yet.
      }

      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: profileUpdateData,
      });
    } else {
      const profileCreateData: Prisma.CompanyProfileCreateInput = {
        company: { connect: { id: companyId } },
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
      };

      try {
        (profileCreateData as Prisma.CompanyProfileUncheckedCreateInput).defaultCashAccountId =
          data.defaultCashAccountId || null;
        (profileCreateData as Prisma.CompanyProfileUncheckedCreateInput).defaultCardAccountId =
          data.defaultCardAccountId || null;
        (profileCreateData as Prisma.CompanyProfileUncheckedCreateInput).defaultQrisAccountId =
          data.defaultQrisAccountId || null;
      } catch {
        // Backward compatibility for older generated Prisma client.
      }

      await prisma.companyProfile.create({
        data: profileCreateData,
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

    revalidateLocalizedPath("/admin/settings/pos");
    revalidateLocalizedPath("/pos");
    return { success: true };
  },
);
