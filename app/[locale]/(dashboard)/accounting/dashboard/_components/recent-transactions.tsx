"use client";

import { useMemo } from "react";
import { DataTable, Column } from "@/components/ui/data-table";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";

type Transaction = {
  id: string;
  date: Date;
  entryNumber: string;
  description: string | null;
  amount: number;
};

type RecentTransactionsProps = {
  data: Transaction[];
};

export function RecentTransactions({ data }: RecentTransactionsProps) {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const columns: Column<Transaction>[] = useMemo(
    () => [
      {
        header: "Date",
        cell: (item) => formatDate(item.date),
      },
      {
        header: "Entry #",
        accessorKey: "entryNumber",
        className: "font-medium",
      },
      {
        header: "Description",
        cell: (item) => item.description || "N/A",
      },
      {
        header: "Amount",
        cell: (item) => formatCurrency(item.amount),
        className: "text-right",
        headerClassName: "text-right",
      },
    ],
    [formatCurrency, formatDate]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No recent transactions."
    />
  );
}
