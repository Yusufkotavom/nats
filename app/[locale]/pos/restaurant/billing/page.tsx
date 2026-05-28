import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/company-context";

/**
 * Legacy route. The Billing board is now a tab inside /pos.
 */
export default async function LegacyBillingRedirect() {
  const companyContext = await getActiveCompanyContext();
  const profile = companyContext?.profile ?? null;
  if (profile?.posEnableRestaurantFeatures !== true) {
    redirect("/pos?tab=cashier");
  }
  redirect("/pos?tab=billing");
}
