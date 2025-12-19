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
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ScaleIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { getLedgerEntries } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Prisma, NormalBalance, AccountType } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { Account } from "../../types";

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
}>;

interface LedgerViewProps {
  accounts: Account[];
}

export function LedgerView({ accounts }: LedgerViewProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  useEffect(() => {
    if (!selectedAccount?.id) return;

    const fetchEntries = async () => {
      setLoading(true);
      const res = await getLedgerEntries(
        selectedAccount.id,
        currentPage,
        20,
        startDate,
        endDate,
        onlyDraft
      );
      if (res.success && res.data) {
        setEntries(res.data as unknown as LedgerEntry[]);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
        }
        if (res.totals) {
          setTotals({
            debit: Number(res.totals.debit),
            credit: Number(res.totals.credit),
          });
        }
        if (res.account) {
          setAccountDetails(res.account as { normalBalance: NormalBalance });
        }
      }
      setLoading(false);
    };

    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedAccount?.id, currentPage, startDate, endDate, onlyDraft]);

  const handleAccountChange = (value: string) => {
    const found = accounts?.find((item) => item.id == value);
    if (found) setSelectedAccount(found);
    setCurrentPage(1);
  };

  const balance =
    accountDetails?.normalBalance === "debit"
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

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
              <div className="text-2xl font-bold">
                {formatCurrency(totals.debit)}
              </div>
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
              <div className="text-2xl font-bold">
                {formatCurrency(totals.credit)}
              </div>
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
              <div className="text-2xl font-bold">
                {formatCurrency(balance)}
                <span className="text-xs text-muted-foreground ml-2">
                  ({accountDetails?.normalBalance})
                </span>
              </div>
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="onlyDraft"
                  checked={onlyDraft}
                  onCheckedChange={(checked) => {
                    setOnlyDraft(checked as boolean);
                    setCurrentPage(1);
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
                  <TableHead className="text-center rounded-tr-lg">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {selectedAccount?.id
                        ? "No transactions found."
                        : "Select an account to view transactions."}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {new Date(
                          entry.journalEntry.transactionDate
                        ).toLocaleDateString()}
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
                      <TableCell className="text-center">
                        <StatusBadge status={entry.journalEntry.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
