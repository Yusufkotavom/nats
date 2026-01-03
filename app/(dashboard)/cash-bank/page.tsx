import { Suspense } from "react";
import { getDashboardStats, getAvailableGLAccounts } from "./actions";
import { DashboardView } from "./_components/dashboard-view";
import { Skeleton } from "@/components/ui/skeleton";

export default async function CashBankPage() {
  const [stats, glAccounts] = await Promise.all([
    getDashboardStats(),
    getAvailableGLAccounts(),
  ]);

  return (
    <div className="container mx-auto px-4">
      <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
        <DashboardView
          accounts={stats.accounts}
          summary={stats.summary}
          recentTransactions={stats.recentTransactions}
          glAccounts={glAccounts}
        />
      </Suspense>
    </div>
  );
}
