export const dynamic = "force-dynamic";

import { getPOSSessions } from "@/app/[locale]/pos/actions";
import { POSSessionsTable } from "./_components/pos-sessions-table";
import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";

import { getTranslations } from "next-intl/server";

export default async function POSSessionsPage() {
  const t = await getTranslations("POS");
  const sessions = await getPOSSessions();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("pos_sessions")} />
      </PageListHeader>

      <PageListContent className="border-0">
        <POSSessionsTable sessions={sessions} />
      </PageListContent>

    </PageListLayout>
  );
}
