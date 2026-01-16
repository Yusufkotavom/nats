"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import {
  getJournalEntries,
  deleteJournalEntry,
  postJournalEntry,
} from "../actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { Protect } from "@/components/ui/protect";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomPagination } from "@/components/ui/custom-pagination";

// Define type based on the return of getJournalEntries
type JournalEntryWithDetails = NonNullable<
  Awaited<ReturnType<typeof getJournalEntries>>["data"]
>[number];

export function JournalEntryTable() {
  const [entries, setEntries] = useState<JournalEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const [isPending, startTransition] = useTransition();
  const [entryToDelete, setEntryToDelete] =
    useState<JournalEntryWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEntries = useCallback(async () => {
    const res = await getJournalEntries({
      page,
      startDate,
      endDate,
      status,
      search,
    });
    if (res.success && res.data) {
      setEntries(res.data);
      const responseWithPagination = res as typeof res & {
        pagination?: { total: number };
      };
      if (responseWithPagination.pagination) {
        setTotal(responseWithPagination.pagination.total);
      }
    }
    setLoading(false);
  }, [startDate, endDate, status, search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchEntries();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchEntries]);

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);

    startTransition(async () => {
      const res = await deleteJournalEntry(entryToDelete.id);
      if (res.success) {
        fetchEntries();
        setEntryToDelete(null);
      } else {
        alert(res.error);
      }
      setIsDeleting(false);
    });
  };

  const handleDelete = (entry: JournalEntryWithDetails) => {
    setEntryToDelete(entry);
  };

  const handlePost = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to post this journal entry? This action cannot be undone."
      )
    )
      return;

    startTransition(async () => {
      const res = await postJournalEntry(id);
      if (res.success) {
        fetchEntries();
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Journal Entries</h2>
        </div>
        <Protect permission="journal_entries.create">
          <Link href="/accounting/journal-entries/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Entry
            </Button>
          </Link>
        </Protect>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="grid items-center gap-1.5 flex-1 min-w-[200px]">
          <CustomInput
            label="Search"
            id="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by description or entry #"
          />
        </div>
        <div className="grid items-center gap-1.5">
          <CustomInput
            label="Start Date"
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid items-center gap-1.5">
          <CustomInput
            label="End Date"
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid items-center gap-1.5 w-[150px]">
          <CustomSelect
            label="Status"
            value={status}
            onValueChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            placeholder="Filter by status"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "draft", label: "Draft" },
              { value: "posted", label: "Posted" },
            ]}
          />
        </div>
        {(startDate || endDate || status !== "all" || search) && (
          <Button
            variant="secondary"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setStatus("all");
              setSearch("");
              setPage(1);
            }}
          >
            Clear Filter
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="[&_tr]:border-b bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead className="rounded-tl-lg">Posted Date</TableHead>
              <TableHead className="rounded-tl-lg">TransactionDate</TableHead>
              <TableHead>Entry #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[70px] rounded-tr-lg"></TableHead>
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
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No journal entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const totalAmount = entry.lines.reduce(
                  (sum, line) => sum + Number(line.debitAmount),
                  0
                );

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {formatDate(entry.postedAt || "Draft")}
                    </TableCell>
                    <TableCell>{formatDate(entry.transactionDate)}</TableCell>
                    <TableCell className="font-medium">
                      <a
                        href={`/accounting/journal-entries/${entry.id}`}
                        target="_blank"
                        className="text-primary hover:underline font-medium"
                      >
                        {entry.entryNumber}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs truncate">
                      {entry.description || "-"}
                    </TableCell>
                    <TableCell>{entry.user.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalAmount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/accounting/journal-entries/${entry.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Details
                            </Link>
                          </DropdownMenuItem>
                          {entry.status === "draft" && (
                            <>
                              <Protect permission="journal_entries.edit">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/accounting/journal-entries/${entry.id}/edit`}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </Link>
                                </DropdownMenuItem>
                              </Protect>
                              <Protect permission="journal_entries.post">
                                <DropdownMenuItem
                                  onClick={() => handlePost(entry.id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" /> Post
                                </DropdownMenuItem>
                              </Protect>
                              <Protect permission="journal_entries.delete">
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleDelete(entry)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </Protect>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CustomPagination
        totalEntries={total}
        currentPage={page}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!entryToDelete}
        onOpenChange={(open) => !open && !isDeleting && setEntryToDelete(null)}
        title="Are you sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete the
            journal entry
            <span className="font-medium text-foreground">
              {" "}
              #{entryToDelete?.entryNumber}
            </span>
            .
          </>
        }
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
