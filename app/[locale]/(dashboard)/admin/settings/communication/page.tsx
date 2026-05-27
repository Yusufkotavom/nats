import { PageListLayout, PageListHeader, PageListTitle, PageListContent } from "@/components/layout/page/list-layout";
import { getTranslations } from "next-intl/server";
import { CommunicationSettingsForm } from "./_components/communication-settings-form";
import { getCompanyCommunicationTemplates } from "@/app/[locale]/communications/actions";

export const dynamic = "force-dynamic";

export default async function CommunicationSettingsPage() {
  const t = await getTranslations("Admin");
  const templates = await getCompanyCommunicationTemplates();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle>{t("communication_settings")}</PageListTitle>
      </PageListHeader>
      <PageListContent>
        <div className="max-w-4xl p-3">
          <CommunicationSettingsForm initialData={templates} />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
