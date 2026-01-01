import { getContacts } from "./actions";
import { ContactTable } from "./_components/contact-table";
import { ContactType } from "@/prisma/generated/prisma/client";

export default async function ContactsPage(props: {
  searchParams: Promise<{ page?: string; search?: string; type?: ContactType }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  const type = searchParams.type;

  const contacts = await getContacts({ page, search, type });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ContactTable initialData={contacts} />
    </div>
  );
}
