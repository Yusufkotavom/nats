import { JournalEntryTable } from "./_components/journal-entry-table";

export default function JournalEntriesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <JournalEntryTable />
    </div>
  );
}
