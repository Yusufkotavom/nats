import { getVendors, getPurchaseOrdersForReturn, getPurchaseInvoicesForReturn } from "../actions";
import { PurchaseReturnForm } from "../_components/purchase-return-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Purchase Return | Pasak",
  description: "Create a new purchase return",
};

export default async function NewPurchaseReturnPage() {
  const [vendors, purchaseOrders, purchaseInvoices] = await Promise.all([
    getVendors(),
    getPurchaseOrdersForReturn(),
    getPurchaseInvoicesForReturn(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">New Purchase Return</h2>
      </div>
      <PurchaseReturnForm
        vendors={vendors}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purchaseOrders={purchaseOrders as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purchaseInvoices={purchaseInvoices as any}
      />
    </div>
  );
}
