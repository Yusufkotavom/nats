"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ScaleIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { getLedgerAccounts } from "../actions";
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
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useLedger } from "./use-ledger";

export function LedgerView({
  accounts,
}: {
  accounts: Awaited<ReturnType<typeof getLedgerAccounts>>["data"];
}) {
  const {
    selectedAccount,
    entries,
    loading,
    accountDetails,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showDraft,
    setShowDraft,
    page,
    setPage,
    handleAccountChange,
    balance,
    pageSize,
  } = useLedger();

  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

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
          <div className="rounded-md border">
            <Table>
              <TableHeader className="[&_tr]:border-b bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead className="rounded-tl-lg">Posted At</TableHead>
                  <TableHead className="rounded-tl-lg">Trans. Date</TableHead>
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
                ) : entries?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {selectedAccount?.id
                        ? "No transactions found."
                        : "Select an account to view transactions."}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries?.items?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatDate(entry.journalEntry.postedAt || "Draft")}
                      </TableCell>
                      <TableCell>
                        {formatDate(entry.journalEntry.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/accounting/journal-entries/${entry.journalEntryId}`}
                          target="_blank"
                          className="text-primary hover:underline font-medium"
                        >
                          {entry.journalEntry.entryNumber}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {entry.description}
                          </span>
                          <span className="text-xs">
                            {entry.journalEntry.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.debitAmount
                          ? formatCurrency(Number(entry.debitAmount))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.creditAmount
                          ? formatCurrency(Number(entry.creditAmount))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(entry.runningBalance))}
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
            totalEntries={entries?.pagination?.total || 0}
            pageSize={pageSize}
            currentPage={page}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
