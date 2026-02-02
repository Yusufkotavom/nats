import { SalesInvoiceForm } from "../_components/sales-invoice-form";
import { Metadata } from "next";
import { getSalesOrdersForSelect, getSalesInvoice } from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "View Sales Invoice | Pasak",
  description: "View sales invoice",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewSalesInvoicePage({ params }: PageProps) {
  const { id } = await params;
  
  const [customers, salesOrders, invoice] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForSelect(),
    getSalesInvoice(id),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <SalesInvoiceForm
      invoice={invoice}
      customers={customers.data}
      salesOrders={salesOrders}
      readonly={true}
    />
  );
}
