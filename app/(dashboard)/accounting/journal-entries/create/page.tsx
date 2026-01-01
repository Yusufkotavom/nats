"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../_components/journal-entry-form";
import { createJournalEntry } from "../actions";
import { getAccounts } from "../../accounts/actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { Account, Contact } from "@/prisma/generated/prisma/browser";
import { CreateJournalEntryData } from "../../types";

export default function CreateJournalEntryPage() {
  const [accounts, setAccounts] = useState<
    (Account & { children?: unknown[] })[]
  >([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([getAccounts(), getContacts({ pageSize: 1000 })]).then(
      ([accountsData, contactsRes]) => {
        setAccounts(
          Array.isArray(accountsData) ? accountsData : accountsData.data || []
        );
        setContacts(contactsRes.data || []);
      }
    );
  }, []);

  const handleSubmit = async (data: CreateJournalEntryData) => {
    setIsSubmitting(true);
    const res = await createJournalEntry(data);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/accounting/journal-entries");
    } else {
      alert(res.error);
    }
  };

  return (
    <JournalEntryForm
      accounts={accounts}
      contacts={contacts}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      onCancel={() => router.push("/accounting/journal-entries")}
    />
  );
}
