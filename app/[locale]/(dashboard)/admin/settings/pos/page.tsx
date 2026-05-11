import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";
import { getPOSSettings } from "./actions";
import { POSSettingsForm } from "./_components/pos-settings-form";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function POSSettingsPage() {
  const t = await getTranslations("Admin");
  const settings = await getPOSSettings();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle>{t("pos_settings")}</PageListTitle>
      </PageListHeader>
      <PageListContent>
        <div className="p-3">
          <POSSettingsForm initialData={settings} />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
