import { getPurchaseOrders } from "./actions";
import { PurchaseOrderTable } from "./_components/purchase-order-table";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseOrderFilters } from "./_components/purchase-order-filters";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const status = params.status || "ALL";
  const startDate = params.startDate;
  const endDate = params.endDate;

  const { orders, totalPages, total } = await getPurchaseOrders(
    page,
    10,
    search,
    status,
    startDate,
    endDate,
  );

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Orders" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/orders/new">
                <Plus className="mr-2 h-4 w-4" /> New Order
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PurchaseOrderFilters />

      <PageListContent>
        <PurchaseOrderTable
          orders={orders}
          totalPages={totalPages}
          totalEntries={total}
        />
      </PageListContent>
    </PageListLayout>
  );
}
