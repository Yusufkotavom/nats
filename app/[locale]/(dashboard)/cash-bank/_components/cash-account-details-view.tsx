"use client";

import { useState } from "react";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  ScaleIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  Paperclip,
  FileIcon,
} from "lucide-react";
import { getCashAccountDetails } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomInput } from "@/components/ui/custom-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function AccountDetailsView({ accountId }: { accountId: string }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const t = useTranslations("CashBank");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const { data, isLoading: loading } = useQuery({
    queryKey: [
      "cash-account-details",
      accountId,
      { page, pageSize, startDate, endDate },
    ],
    queryFn: () =>
      getCashAccountDetails(accountId, {
        page,
        pageSize,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const entries = data?.lines || [];
  const account = data?.account;
  const totalCount = data?.totalCount || 0;
  const totals = data?.periodTotals || { debit: 0, credit: 0 };
  const currentBalance = data?.totalBalance || 0;

  // Net Balance for the period
  const periodNetBalance = totals.debit - totals.credit;

  const columns: Column<any>[] = [
    {
      header: t("date"),
      headerClassName: "rounded-tl-lg",
      cell: (entry) => formatDate(entry.journalEntry.transactionDate),
    },
    {
      header: t("entry_number"),
      cell: (entry) => (
        <Link
          href={`/accounting/journal/${entry.journalEntry.id}`}
          className="text-blue-600 hover:underline"
        >
          {entry.journalEntry.entryNumber}
        </Link>
      ),
    },
    {
      header: t("description"),
      cell: (entry) => (
        <div className="flex flex-col">
          <span className="text-sm">
            {entry.description || entry.journalEntry.description || "-"}
          </span>
          {entry.journalEntry.attachments &&
            entry.journalEntry.attachments.length > 0 && (
              <div className="mt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="h-3 w-3" />
                      {entry.journalEntry.attachments.length} Attachment
                      {entry.journalEntry.attachments.length > 1 ? "s" : ""}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Attachments</DropdownMenuLabel>
                    {entry.journalEntry.attachments.map((file: any) => (
                      <DropdownMenuItem key={file.id} asChild>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <FileIcon className="h-4 w-4" />
                          <span className="max-w-[200px] truncate">
                            {file.name}
                          </span>
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
        </div>
      ),
    },
    {
      header: t("debit"),
      headerClassName: "text-right",
      className: "text-right",
      cell: (entry) =>
        Number(entry.debitAmount) > 0
          ? formatCurrency(Number(entry.debitAmount))
          : "-",
    },
    {
      header: t("credit"),
      headerClassName: "text-right",
      className: "text-right",
      cell: (entry) =>
        Number(entry.creditAmount) > 0
          ? formatCurrency(Number(entry.creditAmount))
          : "-",
    },
    {
      header: t("balance"),
      headerClassName: "text-right",
      className: "text-right font-medium",
      cell: (entry) => formatCurrency(entry.runningBalance),
    },
    {
      header: t("status"),
      headerClassName: "text-center",
      className: "text-center",
      cell: (entry) => <StatusBadge status={entry.journalEntry.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          {loading && !account ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight">
                {account?.name}
              </h2>
              <p className="text-muted-foreground">
                {account?.bankName ? `${account.bankName} - ` : ""}
                {account?.accountNumber}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex gap-2">
              <TrendingUpIcon className="h-4 w-4" />
              <span>Total Debit (In)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(totals.debit)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex gap-2">
              <TrendingDownIcon className="h-4 w-4" />
              <span>Total Credit (Out)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(totals.credit)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex gap-2">
              <ScaleIcon className="h-4 w-4" />
              <span>Net Change</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(periodNetBalance)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex gap-2">
              <ScaleIcon className="h-4 w-4" />
              <span>Current Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(currentBalance)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            <div className="flex items-end gap-4 flex-wrap">
              <CustomInput
                label={t("start_date")}
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
              <CustomInput
                label={t("end_date")}
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={entries}
            columns={columns}
            isLoading={loading}
            emptyMessage="No transactions found."
            pagination={{
              totalEntries: totalCount,
              pageSize,
              currentPage: page,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
