export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { SalesPaymentForm } from "../_components/sales-payment-form";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/accounting/journal-entries/actions";

export const metadata: Metadata = {
  title: "New Sales Payment | NATS",
  description: "Create a new sales payment",
};

export default async function NewSalesPaymentPage({
  searchParams,
}: {
  searchParams?: Promise<{ salesInvoiceId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialSalesInvoiceId = resolvedSearchParams?.salesInvoiceId || undefined;
  const departments = await getDepartments();
  const projects = await getProjects();

  return (
    <SalesPaymentForm
      departments={departments}
      projects={projects}
      initialSalesInvoiceId={initialSalesInvoiceId}
    />
  );
}
