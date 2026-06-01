export const dynamic = "force-dynamic";

import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import { Metadata } from "next";
import { getPurchaseOrdersForSelect } from "../actions";
import { getAccounts } from "@/app/[locale]/(dashboard)/accounting/accounts/actions";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";

export const metadata: Metadata = {
  title: "New Purchase Invoice | NATS",
  description: "Create a new purchase invoice",
};

export default async function NewPurchaseInvoicePage({
  searchParams,
}: {
  searchParams?: Promise<{ purchaseOrderId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialPurchaseOrderId = resolvedSearchParams?.purchaseOrderId || undefined;

  const [vendors, accounts, purchaseOrders, departments, projects, taxRates, productsResult] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getAccounts(),
    getPurchaseOrdersForSelect(),
    getDepartments(),
    getProjects(),
    getTaxRates(),
    getProducts(1, 500),
  ]);

  return (
    <PurchaseInvoiceForm
      vendors={vendors.data}
      purchaseOrders={purchaseOrders}
      products={productsResult.products}
      departments={departments}
      projects={projects.projects}
      taxRates={taxRates}
      initialPurchaseOrderId={initialPurchaseOrderId}
    />
  );
}
