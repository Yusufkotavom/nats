"use client";

import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  CashTransaction,
  CashAccount,
  CashTransactionAllocation,
} from "@/prisma/generated/prisma/browser";
import { useQuery } from "@tanstack/react-query";
import { getCashTransactions } from "../actions";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionWithDetails extends CashTransaction {
  cashAccount: CashAccount;
  allocations: CashTransactionAllocation[];
}

interface TransactionTableProps {
  page?: number;
}

export function TransactionTable({ page = 1 }: TransactionTableProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["cash-transactions", page],
    queryFn: () => getCashTransactions(page),
  });

  const transactions = (data?.transactions || []) as TransactionWithDetails[];

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

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <DataTable
      data={transactions}
      columns={columns}
      emptyMessage="No transactions found."
    />
  );
}
