import { getTranslations } from "next-intl/server";
import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";
import { DataResetForm } from "./_components/data-reset-form";
import { getResetPreviewCounts } from "./actions";

export const dynamic = "force-dynamic";

export default async function DataResetPage() {
  const t = await getTranslations("Admin");
  const preview = await getResetPreviewCounts();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle>{t("transaction_data_reset")}</PageListTitle>
      </PageListHeader>
      <PageListContent>
        <div className="p-3">
          <DataResetForm preview={preview} />
        </div>
      </PageListContent>
    </PageListLayout>
  );
}

