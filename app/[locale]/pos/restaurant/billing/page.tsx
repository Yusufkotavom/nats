import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Legacy route. The Billing board is now a tab inside /pos.
 */
export default async function LegacyBillingRedirect() {
  const profile = await prisma.companyProfile.findFirst({
    select: { posEnableRestaurantFeatures: true },
  });
  if (profile?.posEnableRestaurantFeatures === false) {
    redirect("/pos?tab=cashier");
  }
  redirect("/pos?tab=billing");
}
