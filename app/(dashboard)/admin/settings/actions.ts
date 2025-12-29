"use server";

import { prisma } from "@/lib/prisma";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { revalidatePath } from "next/cache";

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

    const existingProfile = await prisma.companyProfile.findFirst();

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
        },
      });
    } else {
      await prisma.companyProfile.create({
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
        },
      });
    }

    revalidatePath("/", "layout"); // Revalidate everything as this affects global layout
    return { success: true };
  }
);
