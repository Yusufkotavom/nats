"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JournalEntryForm } from "../_components/journal-entry-form";
import { createJournalEntry, CreateJournalEntryData } from "../actions";
import { getAccounts } from "../../accounts/actions";
import { Account } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CreateJournalEntryPage() {
  const [accounts, setAccounts] = useState<
    (Account & { children?: unknown[] })[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getAccounts().then((data) => {
      setAccounts(data);
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
    <div className="flex flex-col gap-6 p-4 w-full mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/accounting/journal-entries">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            New Journal Entry
          </h2>
          <p className="text-muted-foreground">Create a new journal entry</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <JournalEntryForm
          accounts={accounts}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/accounting/journal-entries")}
        />
      </div>
    </div>
  );
}
