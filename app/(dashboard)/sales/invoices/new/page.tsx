export const dynamic = "force-dynamic";

import { SalesInvoiceForm } from "../_components/sales-invoice-form";
import { Metadata } from "next";
import { getSalesOrdersForSelect } from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";
import { getTaxRates } from "@/app/(dashboard)/accounting/configuration/taxes/actions";

export const metadata: Metadata = {
  title: "New Sales Invoice | Pasak",
  description: "Create a new sales invoice",
};

export default async function NewSalesInvoicePage() {
  const [customers, salesOrders, departments, projects, taxRates] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForSelect(),
    getDepartments(),
    getProjects(),
    getTaxRates(),
  ]);

  return (
    <SalesInvoiceForm
      customers={customers.data}
      salesOrders={salesOrders}
      departments={departments}
      projects={projects}
      taxRates={taxRates}
    />
  );
}
