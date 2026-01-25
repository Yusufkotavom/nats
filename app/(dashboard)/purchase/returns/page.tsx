import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPurchaseReturns } from "./actions";
import { PurchaseReturnTable } from "./_components/purchase-return-table";
import { Protect } from "@/components/ui/protect";
import { Metadata } from "next";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseReturnFilters } from "./_components/purchase-return-filters";

export const metadata: Metadata = {
  title: "Purchase Returns | Pasak",
  description: "Manage purchase returns",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function PurchaseReturnsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";

  const { returns, totalPages, total } = await getPurchaseReturns(
    page,
    10,
    search
  );

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Returns" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/returns/new">
                <Plus className="mr-2 h-4 w-4" /> New Return
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PurchaseReturnFilters />

      <PageListContent>
        <Suspense fallback={<div>Loading...</div>}>
          <PurchaseReturnTable
            returns={returns}
            totalPages={totalPages}
            totalEntries={total}
          />
        </Suspense>
      </PageListContent>
    </PageListLayout>
  );
}
