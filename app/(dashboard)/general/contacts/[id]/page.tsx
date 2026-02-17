export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getContact } from "../actions";
import { ContactDetailView } from "./_components/contact-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

import { getSalaryStructure } from "@/app/(dashboard)/hr/payroll/actions";

export default async function ContactDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const contact = await getContact(id);

  if (!contact) {
    notFound();
  }

  let salaryStructure = null;
  if (contact.type === "EMPLOYEE") {
    const res = await getSalaryStructure(contact.id);
    if (res.success) {
      salaryStructure = res.data;
    }
  }

  return (
    <ContactDetailView contact={contact} salaryStructure={salaryStructure} />
  );
}
