import {
  getVendors,
  getAccounts,
  getPurchaseOrdersForSelect,
} from "../actions";
import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Purchase Invoice | Pasak",
  description: "Create a new purchase invoice",
};

export default async function NewPurchaseInvoicePage() {
  const [vendors, accounts, purchaseOrders] = await Promise.all([
    getVendors(),
    getAccounts(),
    getPurchaseOrdersForSelect(),
  ]);

  return (
    <PurchaseInvoiceForm
      vendors={vendors}
      accounts={accounts}
      purchaseOrders={purchaseOrders as any}
    />
  );
}
