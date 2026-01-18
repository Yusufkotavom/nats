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
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";

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
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Cash Transaction" />
        <PageListActions>
          <Button asChild>
            <Link href="/cash-bank/transaction/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </PageListActions>
      </PageListHeader>
      <PageListContent>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <TransactionTable page={page} />
        </HydrationBoundary>
      </PageListContent>
      <CustomPagination totalEntries={total} pageSize={10} currentPage={page} />
    </PageListLayout>
  );
}
