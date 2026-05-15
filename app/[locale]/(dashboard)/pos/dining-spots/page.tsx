export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";
import { getDiningSpotAdminData } from "./actions";
import { DiningSpotManager } from "./_components/dining-spot-manager";
import { prisma } from "@/lib/prisma";

export default async function DiningSpotsPage() {
  const t = await getTranslations("POS");
  const profile = await prisma.companyProfile.findFirst({
    select: { posEnableRestaurantFeatures: true },
  });
  const restaurantEnabled = profile?.posEnableRestaurantFeatures !== false;

  if (!restaurantEnabled) {
    return (
      <PageListLayout>
        <PageListHeader>
          <PageListTitle title={t("dining_spot_management")} />
        </PageListHeader>
        <PageListContent className="p-4 text-sm text-muted-foreground">
          Fitur restoran sedang dinonaktifkan di Admin POS Settings.
        </PageListContent>
      </PageListLayout>
    );
  }

  const data = await getDiningSpotAdminData();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("dining_spot_management")} />
      </PageListHeader>
      <PageListContent className="border-0">
        <DiningSpotManager data={data} />
      </PageListContent>
    </PageListLayout>
  );
}
