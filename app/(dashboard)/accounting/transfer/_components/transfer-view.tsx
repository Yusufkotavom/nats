"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CashTransferDialog } from "../../cash-bank/_components/transfer-dialog";
import { CashAccount } from "../../cash-bank/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

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
                  <TableCell>{transfer.description}</TableCell>
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
