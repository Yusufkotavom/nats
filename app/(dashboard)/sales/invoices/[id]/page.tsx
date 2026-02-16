export const dynamic = "force-dynamic";

import { SalesInvoiceForm } from "../_components/sales-invoice-form";
import { Metadata } from "next";
import { getSalesOrdersForSelect, getSalesInvoice } from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { notFound } from "next/navigation";
import { getDepartments, getProjects } from "@/app/(dashboard)/general/actions";
import { getTaxRates } from "@/app/(dashboard)/accounting/configuration/taxes/actions";

export const metadata: Metadata = {
  title: "View Sales Invoice | Pasak",
  description: "View sales invoice",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewSalesInvoicePage({ params }: PageProps) {
  const { id } = await params;

  const [customers, salesOrders, invoice, departments, projects, taxRates] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForSelect(),
    getSalesInvoice(id),
    getDepartments(),
    getProjects(),
    getTaxRates(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <SalesInvoiceForm
      invoice={invoice}
      customers={customers.data}
      salesOrders={salesOrders}
      departments={departments}
      projects={projects}
      taxRates={taxRates}
      readonly={true}
    />
  );
}
