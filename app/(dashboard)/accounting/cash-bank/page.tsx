import { Suspense } from "react";
import { getCashAccounts, getAvailableGLAccounts } from "./actions";
import { CashAccountList } from "./_components/account-list";
import { Skeleton } from "@/components/ui/skeleton";

export default async function CashBankPage() {
  const [accounts, glAccounts] = await Promise.all([
    getCashAccounts(),
    getAvailableGLAccounts(),
  ]);

  return (
    <div className="container mx-auto px-4">
      <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
        <CashAccountList accounts={accounts} glAccounts={glAccounts} />
      </Suspense>
    </div>
  );
}
