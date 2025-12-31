import {
  getPurchaseInvoice,
  getVendors,
  getAccounts,
  getPurchaseOrdersForSelect,
} from "../../actions";
import { PurchaseInvoiceForm } from "../../_components/purchase-invoice-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Purchase Invoice | Pasak",
  description: "Edit purchase invoice details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPurchaseInvoicePage(props: PageProps) {
  const params = await props.params;
  const [invoice, vendors, accounts, purchaseOrders] = await Promise.all([
    getPurchaseInvoice(params.id),
    getVendors(),
    getAccounts(),
    getPurchaseOrdersForSelect(),
  ]);

  if (!invoice) {
    notFound();
  }

  if (invoice.status === "PAID" || invoice.status === "CANCELED") {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Cannot edit paid or canceled invoices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Edit Purchase Invoice {invoice.invoiceNumber}
        </h2>
      </div>
      <PurchaseInvoiceForm
        invoice={invoice}
        vendors={vendors}
        accounts={accounts}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purchaseOrders={purchaseOrders as any}
      />
    </div>
  );
}
