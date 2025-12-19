import { notFound } from "next/navigation";
import { getJournalEntry } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils";

export default async function JournalEntryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getJournalEntry(id);

  if (!res.success || !res.data) {
    notFound();
  }

  const entry = res.data;
  const totalDebit = entry.lines.reduce(
    (sum, line) => sum + Number(line.debitAmount),
    0
  );
  const totalCredit = entry.lines.reduce(
    (sum, line) => sum + Number(line.creditAmount),
    0
  );

  return (
    <div className="flex flex-col gap-6 p-4 w-full mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Journal Entry {entry.entryNumber}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <span>
                {new Date(entry.transactionDate).toLocaleDateString()}
              </span>
              <span>•</span>
              <StatusBadge status={entry.status} />
            </div>
          </div>
        </div>
        {entry.status === "draft" && (
          <Link href={`/accounting/journal-entries/${entry.id}/edit`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" /> Edit Entry
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Description
          </h3>
          <p className="mt-1 text-lg">{entry.description || "-"}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Lines
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.account.code}</TableCell>
                    <TableCell>{line.account.name}</TableCell>
                    <TableCell>{line.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      {Number(line.debitAmount) > 0
                        ? formatCurrency(Number(line.debitAmount))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(line.creditAmount) > 0
                        ? formatCurrency(Number(line.creditAmount))
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalDebit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Created by {entry.user.name} on{" "}
          {new Date(entry.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
