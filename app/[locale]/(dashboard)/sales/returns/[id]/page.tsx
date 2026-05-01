export const dynamic = "force-dynamic";

import {
  getSalesReturn,
  getSalesOrdersForReturn,
  getSalesInvoicesForReturn,
} from "../actions";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SalesReturnForm } from "../_components/sales-return-form";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { SuperJSON } from "@/lib/superjson";
import { SalesReturnWithDetails } from "../types";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { SuperJSONResult } from "superjson";

export const metadata: Metadata = {
  title: "View Sales Return | NATS",
  description: "View sales return details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewSalesReturnPage(props: PageProps) {
  const params = await props.params;
  const [returnItem, customers, salesOrders, salesInvoices, departments, projects] =
    await Promise.all([
      getSalesReturn(params.id),
      getContacts({ type: ContactType.CUSTOMER }),
      getSalesOrdersForReturn(),
      getSalesInvoicesForReturn(),
      getDepartments(),
      getProjects(),
    ]);

  if (!returnItem) {
    notFound();
  }

  const deserializedReturn =
    SuperJSON.deserialize<SalesReturnWithDetails>(returnItem);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Sales Return {deserializedReturn.returnNumber}
        </h2>
      </div>
      <SalesReturnForm
        returnItem={returnItem}
        customers={customers.data}
        salesOrders={salesOrders as unknown as SuperJSONResult}
        salesInvoices={salesInvoices as unknown as SuperJSONResult}
        departments={departments}
        projects={projects.projects}
        readonly
      />
    </div>
  );
}
