import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPurchaseInvoices } from "./actions";
import { PurchaseInvoiceTable } from "./_components/purchase-invoice-table";
import { Protect } from "@/components/ui/protect";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Invoices | Pasak",
  description: "Manage purchase invoices and bills",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function PurchaseInvoicesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";

  const { invoices, totalPages, total } = await getPurchaseInvoices(
    page,
    10,
    search
  );

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Purchase Invoices</h2>
        <div className="flex items-center space-x-2">
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/invoices/new">
                <Plus className="mr-2 h-4 w-4" /> New Invoice
              </Link>
            </Button>
          </Protect>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <PurchaseInvoiceTable
          invoices={invoices}
          totalPages={totalPages}
          totalEntries={total}
        />
      </Suspense>
    </div>
  );
}
