import { getPurchaseInvoice } from "../actions";
import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import { getPurchaseOrdersForSelect } from "../actions";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";

export const metadata: Metadata = {
  title: "View Purchase Invoice | Pasak",
  description: "View purchase invoice details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewPurchaseInvoicePage(props: PageProps) {
  const params = await props.params;
  const [invoice, vendors, purchaseOrders] = await Promise.all([
    getPurchaseInvoice(params.id),
    getContacts({ type: ContactType.VENDOR }),
    getPurchaseOrdersForSelect(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <PurchaseInvoiceForm
      invoice={invoice}
      vendors={vendors.data}
      purchaseOrders={purchaseOrders}
      readonly
    />
  );
}
