import { SalesInvoiceForm } from "../_components/sales-invoice-form";
import { Metadata } from "next";
import { getSalesOrdersForSelect } from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";

export const metadata: Metadata = {
  title: "New Sales Invoice | Pasak",
  description: "Create a new sales invoice",
};

export default async function NewSalesInvoicePage() {
  const [customers, salesOrders] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForSelect(),
  ]);

  return (
    <SalesInvoiceForm
      customers={customers.data}
      salesOrders={salesOrders}
    />
  );
}
