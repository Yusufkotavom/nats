import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import { Metadata } from "next";
import { getPurchaseOrdersForSelect } from "../actions";
import { getAccounts } from "@/app/(dashboard)/accounting/accounts/actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";

export const metadata: Metadata = {
  title: "New Purchase Invoice | Pasak",
  description: "Create a new purchase invoice",
};

export default async function NewPurchaseInvoicePage() {
  const [vendors, accounts, purchaseOrders] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getAccounts(),
    getPurchaseOrdersForSelect(),
  ]);

  return (
    <PurchaseInvoiceForm
      vendors={vendors.data}
      purchaseOrders={purchaseOrders}
    />
  );
}
