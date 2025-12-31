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

  const { orders, totalPages, total } = await getPurchaseOrders(page, 10, search);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
        <Protect permission="purchase.create">
          <Button asChild>
            <Link href="/purchase/orders/new">
              <Plus className="mr-2 h-4 w-4" /> Create Order
            </Link>
          </Button>
        </Protect>
      </div>
      <PurchaseOrderTable
        orders={orders}
        totalPages={totalPages}
        totalEntries={total}
      />
    </div>
  );
}
