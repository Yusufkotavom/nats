"use client";

import { CashAccountList } from "./account-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  Building2,
  ArrowRight,
  LayoutDashboard,
  List,
} from "lucide-react";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAvailableGLAccounts, getDashboardStats } from "../actions";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperJSON } from "@/lib/superjson";
import { JournalEntryLine } from "@/prisma/generated/prisma/client";

export function DashboardView() {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["cash-bank", "dashboard-stats"],
    queryFn: async () => {
      const data = await getDashboardStats();
      return {
        ...data,
        recentTransactions: SuperJSON.deserialize<
          (JournalEntryLine & {
            journalEntry: any;
            account: any;
          })[]
        >(data.recentTransactions),
      };
    },
  });

  const { data: glAccounts, isLoading: isLoadingGL } = useQuery({
    queryKey: ["cash-bank", "gl-accounts"],
    queryFn: () => getAvailableGLAccounts(),
  });

  if (isLoadingStats || isLoadingGL || !stats || !glAccounts) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const { accounts, summary, recentTransactions } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Cash & Bank</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <List className="mr-2 h-4 w-4" />
            Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Summary Cards */}
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Total Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(summary.totalBalance)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Cash on Hand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalCash)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Bank Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalBank)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">
                Recent Transactions
              </h2>
              <Button variant="ghost" asChild>
                <Link href="/accounting/journal-entries">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Card className="p-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="[&_tr]:border-b bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No recent transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTransactions.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            {formatDate(line.journalEntry.transactionDate)}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/accounting/journal-entries/${line.journalEntry.id}`}
                              className="text-primary hover:underline font-medium"
                              target="_blank"
                            >
                              {line.journalEntry.entryNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {line.account.code} - {line.account.name}
                          </TableCell>
                          <TableCell className="text-xs truncate">
                            {line.description || line.journalEntry.description}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(line.debitAmount) > 0
                              ? formatCurrency(Number(line.debitAmount))
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(line.creditAmount) > 0
                              ? formatCurrency(Number(line.creditAmount))
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={line.journalEntry.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <CashAccountList
            accounts={accounts}
            glAccounts={glAccounts}
            title="Manage Accounts"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
