import {
  getPurchaseReturn,
  getPurchaseOrdersForReturn,
  getPurchaseInvoicesForReturn,
} from "../../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { PurchaseReturnForm } from "../../_components/purchase-return-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Purchase Return | Pasak",
  description: "Edit purchase return details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPurchaseReturnPage(props: PageProps) {
  const params = await props.params;
  const [returnItem, vendors, purchaseOrders, purchaseInvoices] =
    await Promise.all([
      getPurchaseReturn(params.id),
      getContacts({ type: ContactType.VENDOR }),
      getPurchaseOrdersForReturn(),
      getPurchaseInvoicesForReturn(),
    ]);

  if (!returnItem) {
    notFound();
  }

  if (returnItem.status === "COMPLETED" || returnItem.status === "CANCELLED") {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Cannot edit completed or cancelled returns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Edit Purchase Return {returnItem.returnNumber}
        </h2>
      </div>
      <PurchaseReturnForm
        returnItem={returnItem}
        vendors={vendors.data}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purchaseOrders={purchaseOrders as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purchaseInvoices={purchaseInvoices as any}
      />
    </div>
  );
}
