import {
  getSalesOrdersForReturn,
  getSalesInvoicesForReturn,
} from "../actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SalesReturnForm } from "../_components/sales-return-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Sales Return | Pasak",
  description: "Create a new sales return",
};

export default async function NewSalesReturnPage() {
  const [customers, salesOrders, salesInvoices] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getSalesOrdersForReturn(),
    getSalesInvoicesForReturn(),
  ]);

  return (
    <SalesReturnForm
      customers={customers.data}
      salesOrders={salesOrders}
      salesInvoices={salesInvoices}
    />
  );
}
