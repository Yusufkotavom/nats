export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getContact, getContactMessagingContext } from "../actions";
import { ContactDetailView } from "./_components/contact-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const [contact, messagingContext] = await Promise.all([
    getContact(id),
    getContactMessagingContext(id),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <ContactDetailView contact={contact} messagingContext={messagingContext} />
  );
}
