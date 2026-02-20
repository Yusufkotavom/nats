export const dynamic = "force-dynamic";

import { getPOSSessions } from "@/app/[locale]/pos/actions";
import { POSSessionsTable } from "./_components/pos-sessions-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";

export default async function POSSessionsPage() {
  const sessions = await getPOSSessions();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="POS Sessions" />
      </PageListHeader>

      <PageListContent className="border-0">
        <POSSessionsTable sessions={sessions} />
      </PageListContent>

    </PageListLayout>
  );
}
