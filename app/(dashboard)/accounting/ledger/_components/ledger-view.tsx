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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScaleIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { getLedgerEntries } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Account } from "../../types";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { generatePagination } from "@/lib/utils";
import {
  AccountType,
  NormalBalance,
  Prisma,
} from "@/prisma/generated/prisma/browser";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";

type LedgerEntry = Prisma.JournalEntryLineGetPayload<{
  include: {
    journalEntry: {
      select: {
        entryNumber: true;
        transactionDate: true;
        description: true;
        status: true;
      };
    };
  };
}> & { runningBalance: number };

interface LedgerViewProps {
  accounts: Account[];
}

export function LedgerView({ accounts }: LedgerViewProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<{ debit: number; credit: number }>({
    debit: 0,
    credit: 0,
  });
  const [accountDetails, setAccountDetails] = useState<{
    normalBalance: NormalBalance;
  } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [onlyDraft, setOnlyDraft] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  useEffect(() => {
    if (!selectedAccount?.id) return;

    const fetchEntries = async () => {
      setLoading(true);
      const res = await getLedgerEntries(
        selectedAccount.id,
        page,
        pageSize,
        startDate,
        endDate,
        onlyDraft
      );
      if (res.success && res.data) {
        setEntries(res.data as unknown as LedgerEntry[]);
        const responseWithExtras = res as typeof res & {
          totals?: { debit: number | string; credit: number | string };
          account?: { normalBalance: NormalBalance };
          pagination?: { total: number };
        };

        if (responseWithExtras.pagination) {
          setTotal(responseWithExtras.pagination.total);
        }

        if (responseWithExtras.totals) {
          setTotals({
            debit: Number(responseWithExtras.totals.debit),
            credit: Number(responseWithExtras.totals.credit),
          });
        }
        if (responseWithExtras.account) {
          setAccountDetails(responseWithExtras.account);
        }
      }
      setLoading(false);
    };

    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedAccount?.id, startDate, endDate, onlyDraft, page, pageSize]);

  const handleAccountChange = (value: string) => {
    const found = accounts?.find((item) => item.id == value);
    if (found) {
      setSelectedAccount(found);
      setPage(1);
    }
  };

  const balance =
    accountDetails?.normalBalance === "debit"
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

  const totalPages = Math.ceil(total / pageSize);
  const paginationPages = generatePagination(page, totalPages);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">General Ledger</h2>
      </div>

      {selectedAccount?.id && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
                  {formatCurrency(totals.debit)}
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
                  {formatCurrency(totals.credit)}
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

      <Card>
        <CardHeader>
          <CardDescription>
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex flex-col space-y-1">
                <Label>Account</Label>
                <Select
                  value={selectedAccount?.id}
                  onValueChange={handleAccountChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="onlyDraft"
                  checked={onlyDraft}
                  onCheckedChange={(checked) => {
                    setOnlyDraft(checked as boolean);
                    setPage(1);
                  }}
                />
                <Label htmlFor="onlyDraft">Only Draft</Label>
              </div>
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
                  <TableHead className="text-center rounded-tr-lg">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
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
                      {selectedAccount?.id
                        ? "No transactions found."
                        : "Select an account to view transactions."}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatDate(entry.journalEntry.transactionDate)}
                      </TableCell>
                      <TableCell>{entry.journalEntry.entryNumber}</TableCell>
                      <TableCell>
                        {entry.description || entry.journalEntry.description}
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
                      <TableCell className="text-right">
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
          <div className="flex flex-row gap-4 py-4 justify-between">
            <div className="content-center text-sm text-muted-foreground text-center">
              {total > 0
                ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(
                    page * pageSize,
                    total
                  )} of ${total} entries`
                : "No entries found"}
            </div>
            <div>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) setPage(page - 1);
                        }}
                        className={
                          page === 1 ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>
                    {paginationPages.map((pageNum, i) => (
                      <PaginationItem key={i}>
                        {pageNum === "..." ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={page === pageNum}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(Number(pageNum));
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < totalPages) setPage(page + 1);
                        }}
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
