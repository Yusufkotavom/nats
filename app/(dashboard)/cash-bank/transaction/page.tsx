"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getCashTransactions } from "./actions";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  CashTransaction,
  CashAccount,
  CashTransactionAllocation,
} from "@/prisma/generated/prisma/browser";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionWithDetails extends CashTransaction {
  cashAccount: CashAccount;
  allocations: CashTransactionAllocation[];
}

export default function CashTransactionListPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;

  const { data, isLoading } = useQuery({
    queryKey: ["cash-transactions", page],
    queryFn: () => getCashTransactions(page),
  });

  const transactions = (data?.transactions || []) as TransactionWithDetails[];
  const total = data?.total || 0;

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
      accessorKey: "cashAccount",
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
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Cash In & Out" />
        <PageListActions>
          <Button asChild>
            <Link href="/cash-bank/transaction/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </PageListActions>
      </PageListHeader>
      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={transactions}
            columns={columns}
            pagination={{
              totalEntries: total,
              pageSize: 20,
              currentPage: page,
            }}
            emptyMessage="No transactions found."
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
