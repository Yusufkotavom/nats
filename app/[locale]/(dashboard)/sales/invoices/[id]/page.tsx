export const dynamic = "force-dynamic";

import { SalesInvoiceForm } from "../_components/sales-invoice-form";
import { Metadata } from "next";
import { getSalesOrdersForSelect, getSalesInvoice } from "../actions";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { notFound } from "next/navigation";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";
import { getSalesPipelineBridgeByContext } from "../../_lib/pipeline-bridge";
import { SalesPipelineTopbar } from "../../_components/sales-pipeline-topbar";

export const metadata: Metadata = {
  title: "View Sales Invoice | NATS",
  description: "View sales invoice",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewSalesInvoicePage({ params }: PageProps) {
  const { id } = await params;

  const [customers, salesOrders, invoice, departments, projects, taxRates, pipeline] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForSelect(),
    getSalesInvoice(id),
    getDepartments(),
    getProjects(),
    getTaxRates(),
    getSalesPipelineBridgeByContext({ kind: "invoice", id }),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <>
      <SalesPipelineTopbar data={pipeline} active="invoice" />
      <SalesInvoiceForm
        invoice={invoice}
        customers={customers.data}
        salesOrders={salesOrders}
        departments={departments}
        projects={projects.projects}
        taxRates={taxRates}
        readonly={true}
      />
    </>
  );
}
