export const dynamic = "force-dynamic";

import { getPurchaseInvoice } from "../actions";
import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import { getPurchaseOrdersForSelect } from "../actions";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";

export const metadata: Metadata = {
  title: "View Purchase Invoice | NATS",
  description: "View purchase invoice details",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewPurchaseInvoicePage(props: PageProps) {
  const params = await props.params;
  const [invoice, vendors, purchaseOrders, departments, projects, taxRates] = await Promise.all([
    getPurchaseInvoice(params.id),
    getContacts({ type: ContactType.VENDOR }),
    getPurchaseOrdersForSelect(),
    getDepartments(),
    getProjects(),
    getTaxRates(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <PurchaseInvoiceForm
      invoice={invoice}
      vendors={vendors.data}
      purchaseOrders={purchaseOrders}
      departments={departments}
      projects={projects.projects}
      taxRates={taxRates}
      readonly
    />
  );
}
