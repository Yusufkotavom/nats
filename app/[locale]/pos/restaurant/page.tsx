import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/company-context";

/**
 * Legacy route. The Restaurant UI has been consolidated into tabs on /pos.
 * Redirect to the unified POS view on the Floor tab.
 */
export default async function LegacyRestaurantRedirect() {
  const companyContext = await getActiveCompanyContext();
  const profile = companyContext?.profile ?? null;
  if (profile?.posEnableRestaurantFeatures !== true) {
    redirect("/pos?tab=cashier");
  }
  redirect("/pos?tab=floor");
}
