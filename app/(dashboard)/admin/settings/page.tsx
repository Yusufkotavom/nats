import { prisma } from "@/lib/prisma";
import { CompanySettingsForm } from "./company-settings-form";
import { notFound } from "next/navigation";

export default async function SettingsPage() {
  const companyProfile = await prisma.companyProfile.findFirst();

  if (!companyProfile) {
    // This should theoretically not happen due to seeding/layout check
    // But we can handle it or create a default one
    return <div>Company profile not found. Please contact support.</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">Settings</h1>
      <CompanySettingsForm
        initialData={{
          name: companyProfile.name,
          address: companyProfile.address,
          phone: companyProfile.phone,
          email: companyProfile.email,
          website: companyProfile.website,
          taxId: companyProfile.taxId,
          currency: companyProfile.currency,
          currencySymbol: companyProfile.currencySymbol,
          dateFormat: companyProfile.dateFormat,
          currencyFormat: companyProfile.currencyFormat,
          locale: companyProfile.locale,
          timezone: companyProfile.timezone,
        }}
      />
    </div>
  );
}
