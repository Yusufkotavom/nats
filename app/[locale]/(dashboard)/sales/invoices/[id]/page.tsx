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
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "View Sales Invoice | NATS",
  description: "View sales invoice",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewSalesInvoicePage({ params }: PageProps) {
  const { id } = await params;

  const [customers, salesOrders, invoice, departments, projects, taxRates, pipeline, productsResult] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForSelect(id),
    getSalesInvoice(id),
    getDepartments(),
    getProjects(),
    getTaxRates(),
    getSalesPipelineBridgeByContext({ kind: "invoice", id }),
    getProducts(1, 500),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <>
      <SalesPipelineTopbar data={pipeline} active="invoice" />
      <div className="mb-3 flex justify-end">
        <Button asChild>
          <Link href={`/sales/invoices/${id}/edit`}>Edit</Link>
        </Button>
      </div>
      <SalesInvoiceForm
        invoice={invoice}
        customers={customers.data}
        salesOrders={salesOrders}
        departments={departments}
        projects={projects.projects}
        taxRates={taxRates}
        products={productsResult.products}
        readonly={true}
      />
    </>
  );
}
