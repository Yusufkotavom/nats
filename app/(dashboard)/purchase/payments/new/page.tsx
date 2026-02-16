export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { PurchasePaymentForm } from "../_components/purchase-payment-form";
import { getDepartments, getProjects } from "@/app/(dashboard)/accounting/journal-entries/actions";

export const metadata: Metadata = {
  title: "New Purchase Payment | Pasak",
  description: "Create a new purchase payment",
};

export default async function NewPurchasePaymentPage() {
  const departments = await getDepartments();
  const projects = await getProjects();

  return <PurchasePaymentForm departments={departments} projects={projects} />;
}
