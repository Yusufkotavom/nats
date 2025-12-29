import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  getDashboardSummary,
  getFinancialTrends,
  getExpenseBreakdown,
  getRecentTransactions,
} from "./actions";
import { FinancialTrendsChart } from "./_components/financial-trends-chart";
import { ExpenseBreakdownChart } from "./_components/expense-breakdown-chart";
import { RecentTransactions } from "./_components/recent-transactions";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  PlusCircle,
  FileText,
  PieChart,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function AccountingDashboardPage() {
  const companyProfile = await prisma.companyProfile.findFirst();
  const currencyOptions = {
    currency: companyProfile?.currency,
    currencySymbol: companyProfile?.currencySymbol || undefined,
    currencyFormat: companyProfile?.currencyFormat || undefined,
    locale: companyProfile?.locale,
  };

  const format = (val: number) => formatCurrency(val, currencyOptions);

  const [summaryRes, trendsRes, breakdownRes, transactionsRes] =
    await Promise.all([
      getDashboardSummary(),
      getFinancialTrends(),
      getExpenseBreakdown(),
      getRecentTransactions(),
    ]);

  const summary = summaryRes.success
    ? summaryRes.data
    : {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
      };

  const trends = trendsRes.success ? trendsRes.data : [];
  const breakdown = breakdownRes.success ? breakdownRes.data : [];
  const transactions = transactionsRes.success ? transactionsRes.data : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Accounting Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/accounting/journal-entries/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Entry
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/accounting/reports">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Current Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(summary?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Current Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(summary?.netIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Current Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(summary?.accountsReceivable || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding Invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Financial Trends</CardTitle>
            <CardDescription>
              Revenue vs Expenses for the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <FinancialTrendsChart data={trends || []} />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>
              Top 5 expenses for the current month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdownChart data={breakdown || []} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest posted journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentTransactions data={transactions || []} />
        </CardContent>
      </Card>
    </div>
  );
}
