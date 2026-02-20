export const dynamic = "force-dynamic";

import { CompanySettingsForm } from "./company-settings-form";
import { getCompanyProfile } from "./actions";

import { useTranslations } from "next-intl";

export default async function SettingsPage() {
  const t = useTranslations("Admin");
  const companyProfile = await getCompanyProfile();

  if (!companyProfile) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>{t("company_not_found")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>
      <CompanySettingsForm initialData={companyProfile} />
    </div>
  );
}
