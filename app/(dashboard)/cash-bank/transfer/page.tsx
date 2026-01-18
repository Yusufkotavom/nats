import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { getCashAccounts, getTransfers } from "../actions";
import { TransferView } from "./_components/transfer-view";

export default async function TransferPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["cash-transfers"],
      queryFn: () => getTransfers(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["cash-accounts"],
      queryFn: () => getCashAccounts(),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TransferView />
    </HydrationBoundary>
  );
}
