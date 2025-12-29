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
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";

type RecentTransactionsProps = {
  data: {
    id: string;
    date: Date;
    entryNumber: string;
    description: string | null;
    amount: number;
  }[];
};

export function RecentTransactions({ data }: RecentTransactionsProps) {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{formatDate(transaction.date)}</TableCell>
              <TableCell className="font-medium">
                {transaction.entryNumber}
              </TableCell>
              <TableCell>{transaction.description || "N/A"}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(transaction.amount)}
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No recent transactions.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
