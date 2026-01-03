"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AccountDetailsViewProps {
  accountId: string;
}

export function AccountDetailsView({ accountId }: AccountDetailsViewProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<{ debit: number; credit: number }>({
    debit: 0,
    credit: 0,
  });
  const [currentBalance, setCurrentBalance] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const res = await getCashAccountDetails(accountId, {
          page,
          pageSize,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });

        if (res) {
          setEntries(res.lines);
          setAccount(res.account);
          setTotalCount(res.totalCount);
          setTotals(res.periodTotals);
          setCurrentBalance(res.totalBalance);
        }
      } catch (error) {
        console.error("Failed to fetch account details", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);

    return () => clearTimeout(timer);
  }, [accountId, startDate, endDate, page, pageSize]);

  // Net Balance for the period
  const periodNetBalance = totals.debit - totals.credit;

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
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="[&_tr]:border-b bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="rounded-tl-lg">Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && entries.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-24 ml-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatDate(entry.journalEntry.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/accounting/journal/${entry.journalEntry.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {entry.journalEntry.entryNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {entry.description ||
                              entry.journalEntry.description ||
                              "-"}
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
                                      {
                                        entry.journalEntry.attachments.length
                                      }{" "}
                                      Attachment
                                      {entry.journalEntry.attachments.length > 1
                                        ? "s"
                                        : ""}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>
                                      Attachments
                                    </DropdownMenuLabel>
                                    {entry.journalEntry.attachments.map(
                                      (file: any) => (
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
                                      )
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(entry.debitAmount) > 0
                          ? formatCurrency(Number(entry.debitAmount))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(entry.creditAmount) > 0
                          ? formatCurrency(Number(entry.creditAmount))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={entry.journalEntry.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <CustomPagination
            totalEntries={totalCount}
            pageSize={pageSize}
            currentPage={page}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
