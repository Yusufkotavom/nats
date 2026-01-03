"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Paperclip, FileIcon } from "lucide-react";
import { CashTransferDialog } from "../../_components/transfer-dialog";
import { CashAccount } from "../../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface TransferViewProps {
  transfers: any[]; // Using any for now to avoid deep type imports, or better import from Prisma generated
  accounts: CashAccount[];
}

export function TransferView({ transfers, accounts }: TransferViewProps) {
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Transfers</h2>
          <p className="text-sm text-muted-foreground">
            Manage fund transfers between accounts
          </p>
        </div>
        <Button onClick={() => setIsTransferOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No transfers found.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    {format(new Date(transfer.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{transfer.reference || "-"}</TableCell>
                  <TableCell>{transfer.fromAccount.name}</TableCell>
                  <TableCell>{transfer.toAccount.name}</TableCell>
                  <TableCell className="font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(transfer.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{transfer.description}</span>
                      {transfer.journalEntry?.attachments &&
                        transfer.journalEntry.attachments.length > 0 && (
                          <div className="mt-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {
                                    transfer.journalEntry.attachments.length
                                  }{" "}
                                  Attachment
                                  {transfer.journalEntry.attachments.length > 1
                                    ? "s"
                                    : ""}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>
                                  Attachments
                                </DropdownMenuLabel>
                                {transfer.journalEntry.attachments.map(
                                  (file: any) => (
                                    <DropdownMenuItem key={file.id} asChild>
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex cursor-pointer items-center gap-2"
                                      >
                                        <FileIcon className="h-4 w-4" />
                                        <span className="max-w-[200px] truncate">
                                          {file.name}
                                        </span>
                                      </a>
                                    </DropdownMenuItem>
                                  )
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CashTransferDialog
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        cashAccounts={accounts}
        onSuccess={() => {
          setIsTransferOpen(false);
        }}
      />
    </div>
  );
}
