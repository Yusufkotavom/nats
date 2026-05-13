"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";

export type POSProductVisibilityMode = "POS_ONLY" | "ALL_ACTIVE";
export type POSCheckoutFeeConfig = {
  serviceChargePercent: number;
  taxPercent: number;
  additionalFeeAmount: number;
  additionalFeeLabel: string;
};

export async function getPOSSettings() {
  const profile = await prisma.companyProfile.findFirst({
    select: {
      id: true,
      posProductVisibilityMode: true,
      posServiceChargePercent: true,
      posTaxPercent: true,
      posAdditionalFeeAmount: true,
      posAdditionalFeeLabel: true,
    },
  });

  if (!profile) {
    return {
      id: null,
      posProductVisibilityMode: "POS_ONLY" as POSProductVisibilityMode,
      serviceChargePercent: 0,
      taxPercent: 0,
      additionalFeeAmount: 0,
      additionalFeeLabel: "",
    };
  }

  return {
    id: profile.id,
    posProductVisibilityMode:
      (profile.posProductVisibilityMode as POSProductVisibilityMode) || "POS_ONLY",
    serviceChargePercent: Number(profile.posServiceChargePercent || 0),
    taxPercent: Number(profile.posTaxPercent || 0),
    additionalFeeAmount: Number(profile.posAdditionalFeeAmount || 0),
    additionalFeeLabel: profile.posAdditionalFeeLabel || "",
  };
}

export const updatePOSSettings = authorizedAction(
  "company.settings",
  async (data: {
    posProductVisibilityMode: POSProductVisibilityMode;
    serviceChargePercent: number;
    taxPercent: number;
    additionalFeeAmount: number;
    additionalFeeLabel?: string;
  }) => {
    if (!data.posProductVisibilityMode) {
      return { success: false, error: "POS visibility mode is required" };
    }
    if (data.serviceChargePercent < 0 || data.taxPercent < 0 || data.additionalFeeAmount < 0) {
      return { success: false, error: "POS fee values must be greater than or equal to zero" };
    }

    const existing = await prisma.companyProfile.findFirst();

    if (existing) {
      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: {
          posProductVisibilityMode: data.posProductVisibilityMode,
          posServiceChargePercent: data.serviceChargePercent,
          posTaxPercent: data.taxPercent,
          posAdditionalFeeAmount: data.additionalFeeAmount,
          posAdditionalFeeLabel: data.additionalFeeLabel?.trim() || null,
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
          posServiceChargePercent: data.serviceChargePercent,
          posTaxPercent: data.taxPercent,
          posAdditionalFeeAmount: data.additionalFeeAmount,
          posAdditionalFeeLabel: data.additionalFeeLabel?.trim() || null,
        },
      });
    }

    revalidatePath("/admin/settings/pos");
    revalidatePath("/pos");
    return { success: true };
  },
);
