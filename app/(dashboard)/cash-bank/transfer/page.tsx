import { Suspense } from "react";
import { getCashAccounts, getTransfers } from "../actions";
import { TransferView } from "./_components/transfer-view";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TransferPage() {
  const [transfers, accounts] = await Promise.all([
    getTransfers(),
    getCashAccounts(),
  ]);

  return (
    <div className="container mx-auto px-4">
      <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
        <TransferView transfers={transfers} accounts={accounts} />
      </Suspense>
    </div>
  );
}
