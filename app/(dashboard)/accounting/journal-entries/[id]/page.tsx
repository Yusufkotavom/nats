import { notFound } from "next/navigation";
import { getJournalEntry } from "../actions";
import { prisma } from "@/lib/prisma";
import { JournalEntryDetails } from "../_components/journal-entry-details";

export default async function JournalEntryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyProfile = await prisma.companyProfile.findFirst();
  const currencyOptions = {
    currency: companyProfile?.currency,
    currencySymbol: companyProfile?.currencySymbol || undefined,
    currencyFormat: companyProfile?.currencyFormat || undefined,
    locale: companyProfile?.locale,
  };

  const res = await getJournalEntry(id);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <JournalEntryDetails entry={res.data} currencyOptions={currencyOptions} />
  );
}
