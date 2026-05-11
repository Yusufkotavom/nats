"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";

export type POSProductVisibilityMode = "POS_ONLY" | "ALL_ACTIVE";

export async function getPOSSettings() {
  const profile = await prisma.companyProfile.findFirst({
    select: { id: true, posProductVisibilityMode: true },
  });

  if (!profile) {
    return { id: null, posProductVisibilityMode: "POS_ONLY" as POSProductVisibilityMode };
  }

  return {
    id: profile.id,
    posProductVisibilityMode:
      (profile.posProductVisibilityMode as POSProductVisibilityMode) || "POS_ONLY",
  };
}

export const updatePOSSettings = authorizedAction(
  "company.settings",
  async (data: { posProductVisibilityMode: POSProductVisibilityMode }) => {
    if (!data.posProductVisibilityMode) {
      return { success: false, error: "POS visibility mode is required" };
    }

    const existing = await prisma.companyProfile.findFirst();

    if (existing) {
      await prisma.companyProfile.update({
        where: { id: existing.id },
        data: { posProductVisibilityMode: data.posProductVisibilityMode },
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
        },
      });
    }

    revalidatePath("/admin/settings/pos");
    revalidatePath("/pos");
    return { success: true };
  },
);
