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
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          New Purchase Invoice
        </h2>
      </div>
      <PurchaseInvoiceForm
        vendors={vendors}
        accounts={accounts}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purchaseOrders={purchaseOrders as any}
      />
    </div>
  );
}
