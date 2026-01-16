"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  CashTransaction,
  CashAccount,
  CashTransactionAllocation,
} from "@/prisma/generated/prisma/browser";

interface TransactionWithDetails extends CashTransaction {
  cashAccount: CashAccount;
  allocations: CashTransactionAllocation[];
}

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Cash Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const totalAmount = tx.allocations.reduce(
              (sum, a) => sum + Number(a.amount),
              0
            );
            return (
              <TableRow key={tx.id}>
                <TableCell>{formatDate(tx.date)}</TableCell>
                <TableCell>{tx.reference || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={tx.type === "INCOME" ? "default" : "destructive"}
                  >
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell>{tx.cashAccount.name}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalAmount, { currency: "IDR" })}
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center h-24 text-muted-foreground"
              >
                No transactions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
