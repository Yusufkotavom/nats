import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPurchaseReturns } from "./actions";
import { PurchaseReturnTable } from "./_components/purchase-return-table";
import { Protect } from "@/components/ui/protect";
import { Metadata } from "next";

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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Purchase Returns</h2>
        <div className="flex items-center space-x-2">
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/returns/new">
                <Plus className="mr-2 h-4 w-4" /> New Return
              </Link>
            </Button>
          </Protect>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <PurchaseReturnTable
          returns={returns}
          totalPages={totalPages}
          totalEntries={total}
        />
      </Suspense>
    </div>
  );
}
