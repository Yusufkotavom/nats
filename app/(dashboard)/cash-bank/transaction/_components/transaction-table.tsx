"use client";

import { DataTable, Column } from "@/components/ui/data-table";
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
  const columns: Column<TransactionWithDetails>[] = [
    {
      header: "Date",
      cell: (tx) => formatDate(tx.date),
    },
    {
      header: "Reference",
      cell: (tx) => tx.reference || "-",
    },
    {
      header: "Type",
      cell: (tx) => (
        <Badge variant={tx.type === "INCOME" ? "default" : "destructive"}>
          {tx.type}
        </Badge>
      ),
    },
    {
      header: "Cash Account",
      accessorKey: "cashAccount", // accessorKey is optional if cell is provided, but good for reference
      cell: (tx) => tx.cashAccount.name,
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (tx) => {
        const totalAmount = tx.allocations.reduce(
          (sum, a) => sum + Number(a.amount),
          0
        );
        return formatCurrency(totalAmount, { currency: "IDR" });
      },
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      emptyMessage="No transactions found."
    />
  );
}
