export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SuperJSON } from "@/lib/superjson";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import {
  getSalesInvoicesForReturn,
  getSalesOrdersForReturn,
  getSalesReturn,
} from "@/app/[locale]/(dashboard)/sales/returns/actions";
import { SalesReturnForm } from "@/app/[locale]/(dashboard)/sales/returns/_components/sales-return-form";
import { SalesReturnWithDetails } from "@/app/[locale]/(dashboard)/sales/returns/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceReturnWarrantyEditPage(props: PageProps) {
  const params = await props.params;
  const [returnItem, customers, salesOrders, salesInvoices] = await Promise.all([
    getSalesReturn(params.id),
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForReturn(),
    getSalesInvoicesForReturn(),
  ]);

  if (!returnItem) {
    notFound();
  }

  const deserializedReturn = SuperJSON.deserialize<SalesReturnWithDetails>(returnItem);

  if (deserializedReturn.status === "COMPLETED" || deserializedReturn.status === "CANCELLED") {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Cannot edit completed or cancelled returns.</p>
        </div>
      </div>
    );
  }

  return (
    <SalesReturnForm
      returnItem={returnItem}
      customers={customers.data}
      salesOrders={salesOrders}
      salesInvoices={salesInvoices}
    />
  );
}
