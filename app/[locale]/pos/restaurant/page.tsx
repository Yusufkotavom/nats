import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Legacy route. The Restaurant UI has been consolidated into tabs on /pos.
 * Redirect to the unified POS view on the Floor tab.
 */
export default async function LegacyRestaurantRedirect() {
  const profile = await prisma.companyProfile.findFirst({
    select: { posEnableRestaurantFeatures: true },
  });
  if (profile?.posEnableRestaurantFeatures === false) {
    redirect("/pos?tab=cashier");
  }
  redirect("/pos?tab=floor");
}
