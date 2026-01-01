"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../_components/journal-entry-form";
import { createJournalEntry } from "../actions";
import { getAccounts } from "../../accounts/actions";
import { Account } from "@/prisma/generated/prisma/browser";
import { CreateJournalEntryData } from "../../types";

export default function CreateJournalEntryPage() {
  const [accounts, setAccounts] = useState<
    (Account & { children?: unknown[] })[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getAccounts().then((data) => {
      setAccounts(Array.isArray(data) ? data : data.data || []);
    });
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
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      onCancel={() => router.push("/accounting/journal-entries")}
    />
  );
}
