import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getCashTransactions } from "./actions";
import { TransactionTable } from "./_components/transaction-table";
import { CustomPagination } from "@/components/ui/custom-pagination";

export default async function CashTransactionListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;

  const { transactions, totalPages, total } = await getCashTransactions(page);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Cash Transactions</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/cash-bank/transaction/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </div>
      </div>
      <TransactionTable transactions={transactions} />
      <CustomPagination totalEntries={total} pageSize={10} currentPage={page} />
    </div>
  );
}
