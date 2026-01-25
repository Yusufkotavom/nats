import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PurchaseReceiveTable } from "./_components/purchase-receive-table";
import { getPurchaseReceives } from "./actions";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseReceiveFilters } from "./_components/purchase-receive-filters";

export default async function Page(props: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";

  const { receives, totalPages, total } = await getPurchaseReceives(
    page,
    10,
    search
  );

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Receives" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/receives/new">
                <Plus className="mr-2 h-4 w-4" /> New Receive
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PurchaseReceiveFilters />

      <PageListContent>
        <Suspense fallback={<div>Loading...</div>}>
          <PurchaseReceiveTable
            receives={receives}
            totalPages={totalPages}
            totalEntries={total}
          />
        </Suspense>
      </PageListContent>
    </PageListLayout>
  );
}
