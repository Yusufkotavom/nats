import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPurchaseInvoices } from "./actions";
import { PurchaseInvoiceTable } from "./_components/purchase-invoice-table";
import { Protect } from "@/components/ui/protect";
import { Metadata } from "next";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseInvoiceFilters } from "./_components/purchase-invoice-filters";

export const metadata: Metadata = {
  title: "Purchase Invoices | Pasak",
  description: "Manage purchase invoices and bills",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function PurchaseInvoicesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  const status = searchParams.status || "ALL";

  const { invoices, totalPages, total } = await getPurchaseInvoices(
    page,
    10,
    search,
    status
  );

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Invoices" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/invoices/new">
                <Plus className="mr-2 h-4 w-4" /> New Invoice
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PurchaseInvoiceFilters />

      <PageListContent>
        <Suspense fallback={<div>Loading...</div>}>
          <PurchaseInvoiceTable
            invoices={invoices}
            totalPages={totalPages}
            totalEntries={total}
          />
        </Suspense>
      </PageListContent>
    </PageListLayout>
  );
}
