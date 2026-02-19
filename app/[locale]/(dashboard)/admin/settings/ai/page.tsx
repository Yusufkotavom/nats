export const dynamic = "force-dynamic";

import { PageListLayout, PageListHeader, PageListTitle, PageListContent } from "@/components/layout/page/list-layout";
import { getAISettings } from "./actions";
import { AISettingsForm } from "./_components/ai-settings-form";

export default async function AISettingsPage() {
  const settings = await getAISettings();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle>AI Configuration</PageListTitle>
      </PageListHeader>
      <PageListContent>
        <div className="max-w-2xl p-3">
          <AISettingsForm initialData={settings} />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
