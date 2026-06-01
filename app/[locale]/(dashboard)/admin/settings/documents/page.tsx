import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";
import { DocumentSettingsClient } from "./document-settings-client";
import { getDocumentTemplateSettings } from "./actions";

export default async function DocumentSettingsPage() {
  const result = await getDocumentTemplateSettings();

  if (!result.success || !result.data) {
    return <div className="p-4 text-destructive">Failed to load document settings</div>;
  }

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Document Settings" />
      </PageListHeader>
      <PageListContent className="border-0">
        <DocumentSettingsClient data={result.data} />
      </PageListContent>
    </PageListLayout>
  );
}
