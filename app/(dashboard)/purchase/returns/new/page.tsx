import {
  getVendors,
  getPurchaseOrdersForReturn,
  getPurchaseInvoicesForReturn,
} from "../actions";
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
    <PurchaseReturnForm
      vendors={vendors}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      purchaseOrders={purchaseOrders as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      purchaseInvoices={purchaseInvoices as any}
    />
  );
}
