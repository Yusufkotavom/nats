"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { getJournalEntry } from "../actions";
import { JournalEntryDetails } from "../_components/journal-entry-details";

export default function JournalEntryDetailsPage() {
  const params = useParams<{ id: string }>();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    async function fetchEntry() {
      if (!params?.id) return;
      try {
        const res = await getJournalEntry(params.id);
        if (!res.success || !res.data) {
          setIsNotFound(true);
        } else {
          setEntry(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch journal entry", error);
        setIsNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchEntry();
  }, [params?.id]);

  if (isNotFound) {
    notFound();
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading entry details...
      </div>
    );
  }

  return <JournalEntryDetails entry={entry} />;
}
