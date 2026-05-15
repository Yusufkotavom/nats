import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Legacy route. The Kitchen board is now a tab inside /pos.
 */
export default async function LegacyKitchenRedirect() {
  const profile = await prisma.companyProfile.findFirst({
    select: { posEnableRestaurantFeatures: true },
  });
  if (profile?.posEnableRestaurantFeatures === false) {
    redirect("/pos?tab=cashier");
  }
  redirect("/pos?tab=kitchen");
}
