import { PageListLayout, PageListHeader, PageListTitle, PageListContent } from "@/components/layout/page/list-layout";
import { getAISettings } from "./actions";
import { AISettingsForm } from "./_components/ai-settings-form";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AISettingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations("Admin");
  const settings = await getAISettings();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle>{t("ai_configuration")}</PageListTitle>
      </PageListHeader>
      <PageListContent>
        <div className="max-w-2xl p-3">
          <AISettingsForm initialData={settings} />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
