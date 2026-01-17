"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../_components/journal-entry-form";
import { createJournalEntry } from "../actions";
import { getAccounts } from "../../accounts/actions";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { EntryStatus, Prisma } from "@/prisma/generated/prisma/browser";
import { CreateJournalEntryData } from "../../types";
import { generateId } from "@/lib/utils";
import { useAlert } from "@/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreateJournalEntryPage() {
  const router = useRouter();
  const alert = useAlert();
  const queryClient = useQueryClient();

  // Create new entry object only once or useMemo, but since it's just generating IDs,
  // we want it to be fresh on mount.
  // However, putting it in render body means new IDs on every render?
  // No, `initialData` is passed to Form which likely uses it for defaultValues.
  // But strictly speaking, useState(() => ...) is better for ID generation.
  // I'll stick to simple object creation for now as per original code,
  // assuming JournalEntryForm handles initialization.
  // Original code: const newEntry = ... inside component body.

  const [newEntry] = useState<CreateJournalEntryData>(() => ({
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
  }));

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await getAccounts();
      return Array.isArray(res) ? res : res.data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await getContacts({ pageSize: 1000 });
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        router.push("/accounting/journal-entries");
      } else {
        alert({
          title: "Error",
          description: res.error,
        });
      }
    },
  });

  const handleSubmit = async (data: CreateJournalEntryData) => {
    createMutation.mutate(data);
  };

  return (
    <JournalEntryForm
      accounts={accounts}
      contacts={contacts}
      initialData={newEntry}
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
      onCancel={() => router.push("/accounting/journal-entries")}
    />
  );
}
