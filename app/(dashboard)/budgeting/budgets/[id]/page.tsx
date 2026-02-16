export const dynamic = "force-dynamic";

import { getBudgetById, getBudgetVariance } from "@/app/(dashboard)/budgeting/actions";
import { BudgetItemsTable } from "@/components/budgeting/budget-items-table";
import { BudgetActions } from "@/components/budgeting/budget-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/auth/auth";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function BudgetDetailPage({ params }: { params: { id: string } }) {
  const budget = await getBudgetById(params.id);
  if (!budget) return notFound();

  const [varianceData, session, companyProfile] = await Promise.all([
    getBudgetVariance(budget.id),
    getSession(),
    prisma.companyProfile.findFirst()
  ]);

  const currencyOptions = {
    currency: companyProfile?.currency,
    currencySymbol: companyProfile?.currencySymbol,
    currencyFormat: companyProfile?.currencyFormat,
    locale: companyProfile?.locale,
  };

  const dateOptions = {
    dateFormat: companyProfile?.dateFormat,
  };

  // Calculate totals
  const totalBudgeted = varianceData.reduce((acc, item) => acc + item.budgeted, 0);
  const totalActual = varianceData.reduce((acc, item) => acc + item.actual, 0);
  const totalVariance = totalBudgeted - totalActual;
  const percentage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{budget.name}</h2>
          <p className="text-muted-foreground">
            Fiscal Year: {budget.fiscalYear} • {budget.department?.name || budget.project?.name || "Global"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={
            budget.status === "APPROVED" ? "default" :
              budget.status === "REJECTED" ? "destructive" :
                budget.status === "PENDING_APPROVAL" ? "secondary" : "outline"
          }>
            {budget.status}
          </Badge>
          {session?.userId && (
            <BudgetActions budget={budget} currentUserId={session.userId} />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgeted, currencyOptions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual, currencyOptions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance < 0 ? "text-destructive" : "text-green-600"}`}>
              {formatCurrency(totalVariance, currencyOptions)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${percentage > 100 ? "text-destructive" : percentage > 80 ? "text-yellow-600" : ""}`}>
              {percentage.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Items vs Actuals</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetItemsTable items={varianceData} />
        </CardContent>
      </Card>

      {budget.approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budget.approvals.map((approval, index) => (
                <div key={approval.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">
                      Stage {approval.stage}: {approval.role}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: <Badge variant={approval.status === "APPROVED" ? "default" : approval.status === "REJECTED" ? "destructive" : "secondary"}>{approval.status}</Badge>
                    </div>
                    {approval.comments && (
                      <div className="text-sm mt-1 italic">&quot;{approval.comments}&quot;</div>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {approval.approver ? (
                      <>
                        <div>Approved by: {approval.approver.name}</div>
                        <div>{formatDate(approval.updatedAt, dateOptions)}</div>
                      </>
                    ) : (
                      <div>Pending</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
