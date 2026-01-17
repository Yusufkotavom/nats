"use client";

import { useState } from "react";
import { getAccountHistory, getLedgerAccounts } from "./actions";
import { DataTable, Column } from "@/components/ui/data-table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ScaleIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountType } from "@/prisma/generated/prisma/browser";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import {
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";

type LedgerEntry = NonNullable<
  Awaited<ReturnType<typeof getAccountHistory>>["data"]
>["items"][number];

export default function LedgerViewPage() {
  const [selectedAccount, setSelectedAccount] = useState<
    | NonNullable<Awaited<ReturnType<typeof getLedgerAccounts>>["data"]>[number]
    | undefined
  >();

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: accounts = [] } = useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: async () => {
      const resp = await getLedgerAccounts();
      return resp?.data || [];
    },
  });

  const { data: entries, isLoading: loading } = useQuery({
    queryKey: [
      "ledger-entries",
      {
        accountId: selectedAccount?.id,
        page,
        pageSize,
        startDate,
        endDate,
        showDraft,
      },
    ],
    queryFn: async () => {
      if (!selectedAccount?.id) return null;
      const response = await getAccountHistory({
        accountId: selectedAccount.id,
        page,
        pageSize,
        startDate,
        endDate,
        showDraft,
      });
      return response.success ? response.data : null;
    },
    enabled: !!selectedAccount?.id,
    placeholderData: keepPreviousData,
  });

  const accountDetails = entries?.account || null;

  const handleAccountChange = (
    value: string,
    accounts: Awaited<ReturnType<typeof getLedgerAccounts>>["data"]
  ) => {
    const found = accounts?.find((item) => item.id == value);
    if (found) {
      setSelectedAccount(found);
      setPage(1);
    }
  };

  const balance =
    accountDetails?.normalBalance === "debit"
      ? (entries?.totals?.debit ?? 0) - (entries?.totals?.credit ?? 0)
      : (entries?.totals?.credit ?? 0) - (entries?.totals?.debit ?? 0);

  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const columns: Column<LedgerEntry>[] = [
    {
      header: "Posted At",
      cell: (entry) => formatDate(entry.journalEntry.postedAt || "Draft"),
    },
    {
      header: "Trans. Date",
      cell: (entry) => formatDate(entry.journalEntry.transactionDate),
    },
    {
      header: "Entry #",
      cell: (entry) => (
        <Link
          href={`/accounting/journal-entries/${entry.journalEntryId}`}
          target="_blank"
          className="text-primary hover:underline font-medium"
        >
          {entry.journalEntry.entryNumber}
        </Link>
      ),
    },
    {
      header: "Description",
      cell: (entry) => (
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {entry.description}
          </span>
          <span className="text-xs">{entry.journalEntry.description}</span>
        </div>
      ),
    },
    {
      header: "Debit",
      className: "text-right",
      headerClassName: "text-right",
      cell: (entry) =>
        Number(entry.debitAmount) > 0
          ? formatCurrency(Number(entry.debitAmount))
          : "-",
    },
    {
      header: "Credit",
      className: "text-right",
      headerClassName: "text-right",
      cell: (entry) =>
        Number(entry.creditAmount) > 0
          ? formatCurrency(Number(entry.creditAmount))
          : "-",
    },
    {
      header: "Balance",
      className: "text-right",
      headerClassName: "text-right",
      cell: (entry) => formatCurrency(Number(entry.runningBalance)),
    },
    {
      header: "Status",
      className: "text-center",
      headerClassName: "text-center",
      cell: (entry) => <StatusBadge status={entry.journalEntry.status} />,
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="General Ledger" />
      </PageListHeader>

      {selectedAccount?.id && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex gap-2">
                {selectedAccount.type == AccountType.asset ? (
                  <TrendingUpIcon />
                ) : (
                  <TrendingDownIcon />
                )}
                <span>Total Debit</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(entries?.totals?.debit ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex gap-1">
                {selectedAccount.type != AccountType.asset ? (
                  <TrendingUpIcon />
                ) : (
                  <TrendingDownIcon />
                )}
                <span>Total Credit</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(entries?.totals?.credit ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex gap-2">
                <ScaleIcon />
                <span>Net Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(balance)}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({accountDetails?.normalBalance})
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <PageListContent>
        <Card>
          <CardHeader>
            <CardDescription>
              <div className="flex items-end gap-4 flex-wrap">
                {accounts && (
                  <div className="space-y-1">
                    <Label>Account</Label>
                    <SearchableSelect
                      placeholder="Select Account"
                      value={selectedAccount?.id}
                      onValueChange={(val) =>
                        handleAccountChange(val || "", accounts)
                      }
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: `${account.code} - ${account.name}`,
                      }))}
                      className="min-w-[250px]"
                    />
                  </div>
                )}
                <CustomInput
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
                <CustomInput
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="showDraft"
                    checked={showDraft}
                    onCheckedChange={(checked) => {
                      setShowDraft(checked as boolean);
                      setPage(1);
                    }}
                  />
                  <Label htmlFor="showDraft">Show Draft</Label>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={entries?.items || []}
              columns={columns}
              isLoading={loading}
              emptyMessage={
                selectedAccount?.id
                  ? "No transactions found."
                  : "Select an account to view transactions."
              }
              pagination={
                entries?.pagination.total
                  ? {
                      totalEntries: entries.pagination.total,
                      pageSize: pageSize,
                      currentPage: page,
                      onPageChange: setPage,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </PageListContent>
    </PageListLayout>
  );
}
