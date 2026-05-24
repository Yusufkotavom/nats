import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/company-context";

/**
 * Legacy route. The Kitchen board is now a tab inside /pos.
 */
export default async function LegacyKitchenRedirect() {
  const companyContext = await getActiveCompanyContext();
  const profile = companyContext?.profile ?? null;
  if (profile?.posEnableRestaurantFeatures === false) {
    redirect("/pos?tab=cashier");
  }
  redirect("/pos?tab=kitchen");
}
