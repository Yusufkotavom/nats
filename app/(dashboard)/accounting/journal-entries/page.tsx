"use client";

import { useEffect, useState } from "react";
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
import {
  useConfirm,
  useAlert,
  useFormatCurrency,
  useFormatDate,
} from "@/hooks";
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
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  getJournalEntries,
  deleteJournalEntry,
  postJournalEntry,
} from "./actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { Protect } from "@/components/ui/protect";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { SelectItem } from "@/components/ui/select";

// Define type based on the return of getJournalEntries
type JournalEntryWithDetails = NonNullable<
  Awaited<ReturnType<typeof getJournalEntries>>["data"]
>["items"][number];

export default function JournalEntryPage() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const formatDate = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();
  const alert = useAlert();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "journal-entries",
      { page, startDate, endDate, status, search: debouncedSearch },
    ],
    queryFn: async () => {
      const res = await getJournalEntries({
        page,
        startDate,
        endDate,
        status,
        search: debouncedSearch,
      });
      return res.success ? res.data : null;
    },
    placeholderData: keepPreviousData,
  });

  const entries = data?.items || [];
  const total = data?.pagination.total || 0;

  const deleteMutation = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      } else {
        alert({
          title: "Error",
          description: res.error,
        });
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: postJournalEntry,
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      } else {
        alert({
          title: "Error",
          description: res.error,
        });
      }
    },
  });

  const handleDelete = async (entry: JournalEntryWithDetails) => {
    if (
      await confirm({
        title: "Are you sure?",
        description: (
          <>
            This action cannot be undone. This will permanently delete the
            journal entry
            <span className="font-medium text-foreground">
              {" "}
              #{entry.entryNumber}
            </span>
            .
          </>
        ),
        confirmText: "Delete",
        variant: "destructive",
      })
    ) {
      deleteMutation.mutate(entry.id);
    }
  };

  const handlePost = async (id: string) => {
    if (
      await confirm({
        title: "Post Journal Entry",
        description:
          "Are you sure you want to post this journal entry? This action cannot be undone.",
      })
    ) {
      postMutation.mutate(id);
    }
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Journal Entries" />
        <PageListActions>
          <Protect permission="journal_entries.create">
            <Link href="/accounting/journal-entries/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Entry
              </Button>
            </Link>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
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
        <CustomSelect
          label="Status"
          value={status}
          onValueChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
        >
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
        </CustomSelect>
      </PageListFilter>

      <PageListContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No journal entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.transactionDate)}</TableCell>
                      <TableCell className="font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.user?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          entry.lines.reduce((acc, line) => {
                            return acc + Number(line.debitAmount || 0);
                          }, 0)
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell className="text-right">
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
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {entry.status === "draft" && (
                              <>
                                <Protect permission="journal_entries.edit">
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/accounting/journal-entries/${entry.id}/edit`}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                </Protect>
                                <Protect permission="journal_entries.create">
                                  <DropdownMenuItem
                                    onClick={() => handlePost(entry.id)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Post Entry
                                  </DropdownMenuItem>
                                </Protect>
                                <Protect permission="journal_entries.delete">
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(entry)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </Protect>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-4">
              <CustomPagination
                totalEntries={total}
                currentPage={page}
                pageSize={20}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </PageListContent>
    </PageListLayout>
  );
}
