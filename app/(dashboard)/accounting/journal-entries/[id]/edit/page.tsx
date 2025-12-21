"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../../_components/journal-entry-form";
import {
  getJournalEntry,
  updateJournalEntry,
  CreateJournalEntryData,
} from "../../actions";
import { getAccounts } from "../../../accounts/actions";
import { Account } from "@/prisma/generated/prisma/browser";

export default function EditJournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [entry, setEntry] = useState<CreateJournalEntryData | null>(null);
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

        setEntry({
          transactionDate: entryRes.data.transactionDate,
          description: entryRes.data.description || undefined,
          lines: entryRes.data.lines.map((line) => ({
            accountId: line.accountId,
            debitAmount: Number(line.debitAmount),
            creditAmount: Number(line.creditAmount),
            description: line.description || undefined,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          attachments: entryRes.data.attachments?.map((file: any) => ({
            id: file.id,
            name: file.name,
            url: file.url,
          })),
        });
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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Edit Journal Entry
          </h2>
          <p className="text-muted-foreground">Edit existing journal entry</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <JournalEntryForm
          initialData={entry}
          accounts={accounts}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/accounting/journal-entries")}
        />
      </div>
    </div>
  );
}
