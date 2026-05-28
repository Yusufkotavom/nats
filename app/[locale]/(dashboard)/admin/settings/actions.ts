"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { revalidatePath } from "next/cache";
import { requireActiveCompanyContext } from "@/lib/company-context";

interface CompanyProfileData {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  currencyFormat: string;
  locale: string;
  timezone: string;
  serviceUniversalNote?: string | null;
  enableDepartmentDimension: boolean;
  enableProjectDimension: boolean;
}

/**
 * Update company profile settings.
 * Permission: "company.settings"
 *
 * @param data - The company profile data
 * @returns    - Success flag or error
 */
export const updateCompanyProfile = authorizedAction(
  "company.settings",
  async (data: CompanyProfileData) => {
    if (!data.name) {
      return { success: false, error: "Company name is required" };
    }

    const { companyId } = await requireActiveCompanyContext();
    const existingProfile = await prisma.companyProfile.findUnique({
      where: { companyId },
    });

    if (existingProfile) {
      await prisma.companyProfile.update({
        where: { id: existingProfile.id },
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          taxId: data.taxId,
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          dateFormat: data.dateFormat,
          currencyFormat: data.currencyFormat,
          locale: data.locale,
          timezone: data.timezone,
          serviceUniversalNote: data.serviceUniversalNote,
          enableDepartmentDimension: data.enableDepartmentDimension,
          enableProjectDimension: data.enableProjectDimension,
        },
      });
    } else {
      await prisma.companyProfile.create({
        data: {
          companyId,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          taxId: data.taxId,
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          dateFormat: data.dateFormat,
          currencyFormat: data.currencyFormat,
          locale: data.locale,
          timezone: data.timezone,
          serviceUniversalNote: data.serviceUniversalNote,
          enableDepartmentDimension: data.enableDepartmentDimension,
          enableProjectDimension: data.enableProjectDimension,
          posEnableRestaurantFeatures: false,
        },
      });
    }

    revalidatePath("/", "layout"); // Revalidate everything as this affects global layout
    return { success: true };
  }
);

export const getCompanyProfile = async () => {
  const { companyId } = await requireActiveCompanyContext();
  return prisma.companyProfile.findUnique({
    where: { companyId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      taxId: true,
      currency: true,
      currencySymbol: true,
      dateFormat: true,
      currencyFormat: true,
      locale: true,
      timezone: true,
      serviceUniversalNote: true,
      enableDepartmentDimension: true,
      enableProjectDimension: true,
    },
  });
};
