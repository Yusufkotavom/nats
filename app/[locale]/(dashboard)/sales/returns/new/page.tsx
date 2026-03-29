export const dynamic = "force-dynamic";

import {
  getSalesOrdersForReturn,
  getSalesInvoicesForReturn,
} from "../actions";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SalesReturnForm } from "../_components/sales-return-form";
import { Metadata } from "next";
import SuperJSON from "superjson";
import { SuperJSONResult } from "superjson";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";

export const metadata: Metadata = {
  title: "New Sales Return | NATS",
  description: "Create a new sales return",
};

export default async function NewSalesReturnPage() {
  const [customers, salesOrders, salesInvoices, departments, projects] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForReturn(),
    getSalesInvoicesForReturn(),
    getDepartments(),
    getProjects(),
  ]);

  return (
    <SalesReturnForm
      customers={customers.data}
      salesOrders={salesOrders}
      salesInvoices={salesInvoices}
      departments={departments}
      projects={projects}
    />
  );
}
