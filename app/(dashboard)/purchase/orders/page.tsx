import { getPurchaseOrders } from "./actions";
import { PurchaseOrderTable } from "./_components/purchase-order-table";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";

  const { orders, totalPages, total } = await getPurchaseOrders(
    page,
    10,
    search
  );

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Purchase Orders</h2>
        <div className="flex items-center space-x-2">
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/orders/new">
                <Plus className="mr-2 h-4 w-4" /> New Order
              </Link>
            </Button>
          </Protect>
        </div>
      </div>

      <PurchaseOrderTable
        orders={orders}
        totalPages={totalPages}
        totalEntries={total}
      />
    </div>
  );
}
