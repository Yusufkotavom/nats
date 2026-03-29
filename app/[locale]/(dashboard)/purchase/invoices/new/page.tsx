export const dynamic = "force-dynamic";

import { PurchaseInvoiceForm } from "../_components/purchase-invoice-form";
import { Metadata } from "next";
import { getPurchaseOrdersForSelect } from "../actions";
import { getAccounts } from "@/app/[locale]/(dashboard)/accounting/accounts/actions";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";

export const metadata: Metadata = {
  title: "New Purchase Invoice | NATS",
  description: "Create a new purchase invoice",
};

export default async function NewPurchaseInvoicePage() {
  const [vendors, accounts, purchaseOrders, departments, projects, taxRates] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getAccounts(),
    getPurchaseOrdersForSelect(),
    getDepartments(),
    getProjects(),
    getTaxRates(),
  ]);

  return (
    <PurchaseInvoiceForm
      vendors={vendors.data}
      purchaseOrders={purchaseOrders}
      departments={departments}
      projects={projects}
      taxRates={taxRates}
    />
  );
}
