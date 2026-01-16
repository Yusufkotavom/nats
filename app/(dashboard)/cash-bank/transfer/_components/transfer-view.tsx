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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TransferViewProps {
  transfers: CashTransfer[];
  accounts: CashAccount[];
}

export function TransferView({ transfers, accounts }: TransferViewProps) {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<
    CashTransfer | undefined
  >(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleEdit = (transfer: CashTransfer) => {
    setEditingTransfer(transfer);
    setIsTransferOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    startTransition(async () => {
      try {
        await deleteCashTransfer(deletingId);
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
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    startTransition(async () => {
      try {
        await approveCashTransfer(approvingId);
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
      } finally {
        setApprovingId(null);
      }
    });
  };

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
        <Table>
          <TableHeader className="[&_tr]:border-b bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No transfers found.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    {format(new Date(transfer.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{transfer.reference || "-"}</TableCell>
                  <TableCell>{transfer.fromAccount.name}</TableCell>
                  <TableCell>{transfer.toAccount.name}</TableCell>
                  <TableCell className="font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(transfer.amount))}
                  </TableCell>
                  <TableCell>
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
                                  {
                                    transfer.journalEntry.attachments.length
                                  }{" "}
                                  Attachment
                                  {transfer.journalEntry.attachments.length > 1
                                    ? "s"
                                    : ""}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>
                                  Attachments
                                </DropdownMenuLabel>
                                {transfer.journalEntry.attachments.map(
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
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                              <DropdownMenuItem
                                onClick={() => setApprovingId(transfer.id)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(transfer)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingId(transfer.id)}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Transfer"
        description="Are you sure you want to delete this transfer? This action cannot be undone."
      />

      <ConfirmDialog
        open={!!approvingId}
        onOpenChange={(open) => !open && setApprovingId(null)}
        onConfirm={handleApprove}
        title="Approve Transfer"
        description="This will create a journal entry and post it to the General Ledger. This action cannot be undone."
      />
    </div>
  );
}
