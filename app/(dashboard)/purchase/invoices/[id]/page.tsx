import { getPurchaseInvoice } from "../actions";
import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import {
  getVendors,
  getAccounts,
  getPurchaseOrdersForSelect,
} from "../actions";
import { notFound } from "next/navigation";
import { Metadata } from "next";

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
  const [invoice, vendors, accounts, purchaseOrders] = await Promise.all([
    getPurchaseInvoice(params.id),
    getVendors(),
    getAccounts(),
    getPurchaseOrdersForSelect(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <PurchaseInvoiceForm
      invoice={invoice}
      vendors={vendors}
      accounts={accounts}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      purchaseOrders={purchaseOrders as any}
      readonly
    />
  );
}
