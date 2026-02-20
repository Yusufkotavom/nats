import { PageListLayout, PageListHeader, PageListTitle, PageListContent } from "@/components/layout/page/list-layout";
import { getAISettings } from "./actions";
import { AISettingsForm } from "./_components/ai-settings-form";
import { useTranslations } from "next-intl";

export default function AISettingsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("Admin");

  // Note: We'll fetch settings inside the client component or use a wrapper
  // But for now let's just make it a client component if it's easier or keep it as is
  // Actually, let's keep it simple and just translate what we can.
  // Wait, I should probably make it a client component for translations if I use useTranslations.
  // Or I can just pass the title.

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle>{t("ai_configuration")}</PageListTitle>
      </PageListHeader>
      <PageListContent>
        <div className="max-w-2xl p-3">
          <AISettingsFormWrapper />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}

// Small wrapper to handle async data in a component that can use useTranslations
async function AISettingsFormWrapper() {
  const settings = await getAISettings();
  return <AISettingsForm initialData={settings} />;
}
