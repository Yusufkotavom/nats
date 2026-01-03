import { getPurchaseInvoice, getPurchaseOrdersForSelect } from "../../actions";
import { PurchaseInvoiceForm } from "../../_components/purchase-invoice-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";

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
  const [invoice, vendors, purchaseOrders] = await Promise.all([
    getPurchaseInvoice(params.id),
    getContacts({ type: ContactType.VENDOR }),
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
    <PurchaseInvoiceForm
      invoice={invoice}
      vendors={vendors.data}
      purchaseOrders={purchaseOrders as any}
    />
  );
}
