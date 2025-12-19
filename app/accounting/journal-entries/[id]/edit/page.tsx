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
import { Account } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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
        });
      }
      setAccounts(accountsData);
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
    <div className="flex flex-col gap-6 p-4 w-full mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/accounting/journal-entries">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
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
