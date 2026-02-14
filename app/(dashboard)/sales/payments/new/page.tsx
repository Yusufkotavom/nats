import { Metadata } from "next";
import { SalesPaymentForm } from "../_components/sales-payment-form";
import { getDepartments, getProjects } from "@/app/(dashboard)/accounting/journal-entries/actions";

export const metadata: Metadata = {
  title: "New Sales Payment | Pasak",
  description: "Create a new sales payment",
};

export default async function NewSalesPaymentPage() {
  const departments = await getDepartments();
  const projects = await getProjects();

  return <SalesPaymentForm departments={departments} projects={projects} />;
}
