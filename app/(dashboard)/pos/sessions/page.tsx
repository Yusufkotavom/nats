export const dynamic = "force-dynamic";

import { getPOSSessions } from "@/app/pos/actions";
import { POSSessionsTable } from "./_components/pos-sessions-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";

export default async function POSSessionsPage() {
  const sessions = await getPOSSessions();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="POS Sessions" />
      </PageListHeader>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <POSSessionsTable sessions={sessions} />
        </div>
      </div>
    </PageListLayout>
  );
}
