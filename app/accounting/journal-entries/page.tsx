"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  getJournalEntries,
  deleteJournalEntry,
  postJournalEntry,
} from "./actions";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils";

// Define type based on the return of getJournalEntries
type JournalEntryWithDetails = NonNullable<
  Awaited<ReturnType<typeof getJournalEntries>>["data"]
>[number];

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchEntries = useCallback(
    async (page: number = 1) => {
      const res = await getJournalEntries(
        page,
        pageSize,
        startDate,
        endDate,
        status,
        search
      );
      if (res.success && res.data) {
        setEntries(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setCurrentPage(res.pagination.currentPage);
        }
      }
      setLoading(false);
    },
    [pageSize, startDate, endDate, status, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchEntries(1);
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this journal entry?")) return;

    startTransition(async () => {
      const res = await deleteJournalEntry(id);
      if (res.success) {
        fetchEntries(currentPage);
      } else {
        alert(res.error);
      }
    });
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
        fetchEntries(currentPage);
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Journal Entries</h2>
        </div>
        <Link href="/accounting/journal-entries/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </Button>
        </Link>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="grid items-center gap-1.5 flex-1 min-w-[200px]">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description or entry #"
          />
        </div>
        <div className="grid items-center gap-1.5">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="grid items-center gap-1.5">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="grid items-center gap-1.5 w-[150px]">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(startDate || endDate || status !== "all" || search) && (
          <Button
            variant="secondary"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setStatus("all");
              setSearch("");
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
              <TableHead className="rounded-tl-lg">Date</TableHead>
              <TableHead>Entry #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Credit</TableHead>
              <TableHead className="w-[70px] rounded-tr-lg"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No journal entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const totalDebit = entry.lines.reduce(
                  (sum, line) => sum + Number(line.debitAmount),
                  0
                );
                const totalCredit = entry.lines.reduce(
                  (sum, line) => sum + Number(line.creditAmount),
                  0
                );

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.transactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.entryNumber}
                    </TableCell>
                    <TableCell>{entry.description || "-"}</TableCell>
                    <TableCell>{entry.user.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalDebit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalCredit)}
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
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/accounting/journal-entries/${entry.id}/edit`}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePost(entry.id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> Post
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDelete(entry.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
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

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchEntries(currentPage - 1);
          }}
          disabled={currentPage <= 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchEntries(currentPage + 1);
          }}
          disabled={currentPage >= totalPages || loading}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
