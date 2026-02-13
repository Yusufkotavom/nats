import {
  getPurchaseOrdersForReturn,
  getPurchaseInvoicesForReturn,
} from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { PurchaseReturnForm } from "../_components/purchase-return-form";
import { Metadata } from "next";
import { PurchaseOrderWithDetails } from "../../orders/types";
import SuperJSON from "superjson";
import { PurchaseInvoiceWithDetails } from "../../invoices/types";
import { SuperJSONResult } from "superjson";

export const metadata: Metadata = {
  title: "New Purchase Return | Pasak",
  description: "Create a new purchase return",
};

export default async function NewPurchaseReturnPage() {
  const [vendors, purchaseOrders, purchaseInvoices] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getPurchaseOrdersForReturn(),
    getPurchaseInvoicesForReturn(),
  ]);

  return (
    <PurchaseReturnForm
      vendors={vendors.data}
      purchaseOrders={SuperJSON.deserialize(
        purchaseOrders as unknown as SuperJSONResult,
      )}
      purchaseInvoices={SuperJSON.deserialize(
        purchaseInvoices as unknown as SuperJSONResult,
      )}
    />
  );
}
