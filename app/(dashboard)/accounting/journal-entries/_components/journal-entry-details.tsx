"use client";

import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { TableFooter, TableRow, TableCell } from "@/components/ui/table";
import Link from "next/link";
import { Pencil, Paperclip, ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getJournalEntry } from "../actions";
import { Decimal } from "decimal.js";
import { JournalEntryWithDetails } from "../../types";

export function JournalEntryDetails({
  entry,
}: {
  entry: JournalEntryWithDetails;
}) {
  const router = useRouter();

  const totalDebit = entry?.lines.reduce(
    (sum: number, line: any) =>
      sum +
      (line.debitAmount instanceof Decimal
        ? line.debitAmount.toNumber()
        : Number(line.debitAmount || 0)),
    0,
  );
  const totalCredit = entry?.lines.reduce(
    (sum: number, line: any) =>
      sum +
      (line.creditAmount instanceof Decimal
        ? line.creditAmount.toNumber()
        : Number(line.creditAmount || 0)),
    0,
  );

  const columns: Column<any>[] = [
    {
      header: "Account Code",
      accessorKey: "account",
      cell: (line) => line.account.code,
    },
    {
      header: "Account Name",
      accessorKey: "account",
      cell: (line) => line.account.name,
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (line) => line.description || "-",
    },
    {
      header: "Relevant Contact",
      accessorKey: "contact",
      cell: (line) => line.contact?.name || "-",
    },
    {
      header: "Debit",
      headerClassName: "text-right",
      className: "text-right",
      cell: (line) => {
        const amount =
          line.debitAmount instanceof Decimal
            ? line.debitAmount.toNumber()
            : Number(line.debitAmount || 0);
        return amount > 0 ? formatCurrency(amount) : "-";
      },
    },
    {
      header: "Credit",
      headerClassName: "text-right",
      className: "text-right",
      cell: (line) => {
        const amount =
          line.creditAmount instanceof Decimal
            ? line.creditAmount.toNumber()
            : Number(line.creditAmount || 0);
        return amount > 0 ? formatCurrency(amount) : "-";
      },
    },
  ];

  return (
    entry && (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 w-full">
        <div className="flex items-center">
          <div className="flex items-center gap-4 justify-between w-full">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold tracking-tight">
                Journal Entry
              </h2>
              <div className="flex items-center text-sm gap-2 text-muted-foreground mt-1">
                <span>{entry.entryNumber}</span>
                <span>•</span>
                <span>
                  {new Date(entry.transactionDate).toLocaleDateString()}
                </span>
                <span>•</span>
                <StatusBadge status={entry.status} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
          {entry.status === "draft" && (
            <Link href={`/accounting/journal-entries/${entry.id}/edit`}>
              <Button className="ml-2">
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
              <DataTable
                data={entry.lines}
                columns={columns}
                footer={
                  <TableFooter>
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={4} className="text-right">
                        Total
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(totalDebit))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(totalCredit))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                }
              />
            </div>
          </div>

          {entry.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Notes
              </h3>
              <div className="rounded-md border p-4 bg-muted/30">
                <p className="whitespace-pre-wrap text-sm">{entry.notes}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Attachments
            </h3>
            {entry.attachments && entry.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {entry.attachments.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm hover:bg-muted/80"
                  >
                    <Paperclip className="h-4 w-4" />
                    {file.name}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attachments</p>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              Created by {entry.user.name} on{" "}
              {new Date(entry.createdAt).toLocaleString()}
            </p>
            {entry.status === "posted" && entry.postedAt && (
              <p>Posted on {new Date(entry.postedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    )
  );
}
