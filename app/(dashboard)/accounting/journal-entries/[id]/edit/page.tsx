"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../../_components/journal-entry-form";
import { getJournalEntry, updateJournalEntry } from "../../actions";
import { getAccounts } from "../../../accounts/actions";
import { Account } from "@/prisma/generated/prisma/browser";
import { CreateJournalEntryData } from "../../../types";

export default function EditJournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [entry, setEntry] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<
    (Account & { children?: unknown[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [entryRes, accountsData] = await Promise.all([
        getJournalEntry(id),
        getAccounts(),
      ]);

      if (entryRes.success && entryRes.data) {
        if (entryRes.data.status === "posted") {
          alert("Cannot edit posted journal entries");
          router.push(`/accounting/journal-entries/${id}`);
          return;
        }

        setEntry(entryRes.data);
      }
      if (Array.isArray(accountsData)) {
        setAccounts(accountsData);
      }
      setLoading(false);
    };

    loadData();
  }, [id, router]);

  const handleSubmit = async (data: CreateJournalEntryData) => {
    setIsSubmitting(true);
    const res = await updateJournalEntry(id, data);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/accounting/journal-entries");
    } else {
      alert(res.error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!entry) {
    return <div className="p-8 text-center">Journal Entry not found</div>;
  }

  return (
    <JournalEntryForm
      initialData={entry}
      accounts={accounts}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      onCancel={() => router.push("/accounting/journal-entries")}
    />
  );
}
