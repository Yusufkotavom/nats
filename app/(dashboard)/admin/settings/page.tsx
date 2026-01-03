import { CompanySettingsForm } from "./company-settings-form";
import { getCompanyProfile } from "./actions";

export default async function SettingsPage() {
  const companyProfile = await getCompanyProfile();

  if (!companyProfile) {
    return <div>Company profile not found. Please contact support.</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">Settings</h1>
      <CompanySettingsForm initialData={companyProfile} />
    </div>
  );
}
