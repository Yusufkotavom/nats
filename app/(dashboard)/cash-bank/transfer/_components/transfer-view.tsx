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
} from "lucide-react";
import { CashTransferDialog } from "../../_components/transfer-dialog";
import { CashAccount, CashTransfer } from "../../types";
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
import { approveCashTransfer, deleteCashTransfer } from "../../actions";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";

interface TransferViewProps {
  transfers: CashTransfer[];
  accounts: CashAccount[];
}

export function TransferView({ transfers, accounts }: TransferViewProps) {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<
    CashTransfer | undefined
  >(undefined);
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const handleEdit = (transfer: CashTransfer) => {
    setEditingTransfer(transfer);
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
      header: "From",
      cell: (transfer) => transfer.fromAccount.name,
    },
    {
      header: "To",
      cell: (transfer) => transfer.toAccount.name,
    },
    {
      header: "Amount",
      className: "font-medium",
      cell: (transfer) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(transfer.amount)),
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
              {transfer.status === TransferStatus.APPROVED && (
                <DropdownMenuItem disabled>
                  Approved (Read Only)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Transfers</h2>
          <p className="text-sm text-muted-foreground">
            Manage fund transfers between accounts
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTransfer(undefined);
            setIsTransferOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </div>

      <div className="rounded-md border">
        <DataTable
          data={transfers}
          columns={columns}
          emptyMessage="No transfers found."
        />
      </div>

      <CashTransferDialog
        open={isTransferOpen}
        onOpenChange={(open) => {
          setIsTransferOpen(open);
          if (!open) setEditingTransfer(undefined);
        }}
        cashAccounts={accounts}
        onSuccess={() => {
          setIsTransferOpen(false);
        }}
        transfer={editingTransfer}
      />
    </div>
  );
}
