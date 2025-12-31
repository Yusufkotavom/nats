import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PurchaseReceiveTable } from "./_components/purchase-receive-table";
import { getPurchaseReceives } from "./actions";
import { Protect } from "@/components/ui/protect";

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
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Purchase Receives</h2>
        <div className="flex items-center space-x-2">
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/receives/new">
                <Plus className="mr-2 h-4 w-4" /> New Receive
              </Link>
            </Button>
          </Protect>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <PurchaseReceiveTable
          receives={receives}
          totalPages={totalPages}
          totalEntries={total}
        />
      </Suspense>
    </div>
  );
}
