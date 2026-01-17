import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getCashTransactions } from "./actions";
import { TransactionTable } from "./_components/transaction-table";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

export default async function CashTransactionListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;

  const queryClient = new QueryClient();

  // Prefetch data
  await queryClient.prefetchQuery({
    queryKey: ["cash-transactions", page],
    queryFn: () => getCashTransactions(page),
  });

  // Get data for pagination (we can also get it from queryClient but awaiting again is fine as it's cached/same request usually)
  const { total } = await getCashTransactions(page);

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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TransactionTable page={page} />
      </HydrationBoundary>
      <CustomPagination totalEntries={total} pageSize={10} currentPage={page} />
    </div>
  );
}
