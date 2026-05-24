export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
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

export default async function ServiceReturnWarrantyDetailPage(props: PageProps) {
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

  SuperJSON.deserialize<SalesReturnWithDetails>(returnItem);

  return (
    <SalesReturnForm
      returnItem={returnItem}
      customers={customers.data}
      salesOrders={salesOrders as unknown as SuperJSONResult}
      salesInvoices={salesInvoices as unknown as SuperJSONResult}
      departments={departments}
      projects={projects.projects}
      readonly
    />
  );
}
