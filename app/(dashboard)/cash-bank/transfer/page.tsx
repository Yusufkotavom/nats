"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Paperclip,
  FileIcon,
  MoreHorizontal,
  Check,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { CashTransferDialog } from "./_components/transfer-dialog";
import { CashTransfer } from "../types";
import { DataTable, Column } from "@/components/ui/data-table";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TransferStatus } from "@/prisma/generated/prisma/enums";
import {
  approveCashTransfer,
  deleteCashTransfer,
  getTransfers,
  getCashAccounts,
} from "../actions";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { useFormatCurrency } from "@/hooks";
import { SuperJSON } from "@/lib/superjson";

export default function TransferPage() {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<
    CashTransfer | undefined
  >(undefined);
  const [isViewMode, setIsViewMode] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery({
    queryKey: ["cash-transfers"],
    queryFn: async () => {
      const serialized = await getTransfers();
      return SuperJSON.deserialize<CashTransfer[]>(serialized);
    },
  });

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["cash-accounts"],
    queryFn: () => getCashAccounts(),
  });

  const handleEdit = (transfer: CashTransfer) => {
    setEditingTransfer(transfer);
    setIsViewMode(false);
    setIsTransferOpen(true);
  };

  const handleView = (transfer: CashTransfer) => {
    setEditingTransfer(transfer);
    setIsViewMode(true);
    setIsTransferOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: "Delete Transfer",
        description:
          "Are you sure you want to delete this transfer? This action cannot be undone.",
      })
    ) {
      startTransition(async () => {
        try {
          await deleteCashTransfer(id);
          queryClient.invalidateQueries({ queryKey: ["cash-transfers"] });
          toast({
            title: "Success",
            description: "Transfer deleted successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description:
              error instanceof Error ? error.message : "Failed to delete",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleApprove = async (id: string) => {
    if (
      await confirm({
        title: "Approve Transfer",
        description:
          "Are you sure you want to approve this transfer? This will post the journal entries.",
      })
    ) {
      startTransition(async () => {
        try {
          await approveCashTransfer(id);
          queryClient.invalidateQueries({ queryKey: ["cash-transfers"] });
          toast({
            title: "Success",
            description: "Transfer approved successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description:
              error instanceof Error ? error.message : "Failed to approve",
            variant: "destructive",
          });
        }
      });
    }
  };

  const columns: Column<CashTransfer>[] = [
    {
      header: "Date",
      cell: (transfer) => format(new Date(transfer.date), "MMM d, yyyy"),
    },
    {
      header: "Reference",
      cell: (transfer) => transfer.reference || "-",
    },
    {
      header: "From - To",
      cell: (transfer) =>
        `${transfer.fromAccount.name} -> ${transfer.toAccount.name}`,
    },
    {
      header: "Description",
      cell: (transfer) => (
        <div className="flex flex-col">
          <span>{transfer.description}</span>
          {transfer.journalEntry?.attachments &&
            transfer.journalEntry.attachments.length > 0 && (
              <div className="mt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="h-3 w-3" />
                      {transfer.journalEntry.attachments.length} Attachment
                      {transfer.journalEntry.attachments.length > 1 ? "s" : ""}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Attachments</DropdownMenuLabel>
                    {transfer.journalEntry.attachments.map((file: any) => (
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
      header: "Amount",
      className: "font-medium",
      cell: (transfer) => formatCurrency(Number(transfer.amount)),
    },
    {
      header: "Status",
      cell: (transfer) => (
        <Badge
          variant={
            transfer.status === TransferStatus.APPROVED
              ? "default"
              : transfer.status === TransferStatus.REJECTED
              ? "destructive"
              : "secondary"
          }
        >
          {transfer.status}
        </Badge>
      ),
    },
    {
      header: "",
      className: "w-[50px]",
      cell: (transfer) => (
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleView(transfer)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {transfer.status === TransferStatus.PENDING && (
                <>
                  <DropdownMenuItem onClick={() => handleApprove(transfer.id)}>
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(transfer)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(transfer.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Transfer" />
        <PageListActions>
          <Button
            onClick={() => {
              setEditingTransfer(undefined);
              setIsViewMode(false);
              setIsTransferOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
          </Button>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <DataTable
          data={transfers}
          columns={columns}
          emptyMessage="No transfers found."
        />
      </PageListContent>

      <CashTransferDialog
        open={isTransferOpen}
        onOpenChange={(open) => {
          setIsTransferOpen(open);
          if (!open) {
            setEditingTransfer(undefined);
            setIsViewMode(false);
          }
        }}
        cashAccounts={accounts}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["cash-transfers"] });
          queryClient.invalidateQueries({
            queryKey: ["cash-bank", "dashboard-stats"],
          });
          setIsTransferOpen(false);
        }}
        transfer={editingTransfer}
        viewOnly={isViewMode}
      />
    </PageListLayout>
  );
}
