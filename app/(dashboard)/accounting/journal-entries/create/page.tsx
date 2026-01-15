"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../_components/journal-entry-form";
import { createJournalEntry } from "../actions";
import { getAccounts } from "../../accounts/actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import {
  Account,
  Contact,
  EntryStatus,
  Prisma,
} from "@/prisma/generated/prisma/browser";
import { CreateJournalEntryData } from "../../types";
import { generateId } from "@/lib/utils";

export default function CreateJournalEntryPage() {
  const [accounts, setAccounts] = useState<
    (Account & { children?: unknown[] })[]
  >([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const newEntry: CreateJournalEntryData = {
    id: generateId(),
    userId: "",
    entryNumber: "",
    transactionDate: new Date(),
    description: "",
    status: EntryStatus.draft,
    postedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: "",
    user: { name: "", email: "" },
    lines: Array.from({ length: 2 }, (_, i) => ({
      id: generateId(),
      journalEntryId: "",
      accountId: "",
      account: { name: "", code: "" },
      lineNumber: i,
      debitAmount: new Prisma.Decimal(0),
      creditAmount: new Prisma.Decimal(0),
      runningBalance: new Prisma.Decimal(0),
      description: "",
      contactId: null,
      contact: null,
    })),
    attachments: [],
  };

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
      initialData={newEntry}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      onCancel={() => router.push("/accounting/journal-entries")}
    />
  );
}
