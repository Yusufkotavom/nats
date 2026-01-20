"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createCashTransfer,
  updateCashTransfer,
  uploadTransferAttachment,
} from "../../actions";
import { CashAccount, CashTransfer, CashTransferFormData } from "../../types";
import { Loader2, Paperclip } from "lucide-react";
import { useToast, useFormatDate } from "@/hooks";
import { Label } from "@/components/ui/label";
import { AttachmentDialog } from "@/components/ui/attachment-dialog";
import { useEffect } from "react";
import { Prisma } from "@/prisma/generated/prisma/browser";
import { useAttachmentDialog } from "@/hooks/use-attachment-dialog";

interface CashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashAccounts: CashAccount[];
  onSuccess: () => void;
  transfer?: CashTransfer;
  viewOnly?: boolean;
}

export function CashTransferDialog({
  open,
  onOpenChange,
  cashAccounts,
  onSuccess,
  transfer,
  viewOnly,
}: CashTransferDialogProps) {
  const { toast } = useToast();
  const formatDate = useFormatDate();
  const [formData, setFormData] = useState<CashTransferFormData>({
    fromAccountId: "",
    toAccountId: "",
    amount: new Prisma.Decimal(0),
    date: new Date(),
    reference: "",
    description: "",
    attachmentIds: [],
  });
  const attachmentDialog = useAttachmentDialog();
  const [isPending, startTransition] = useTransition();

  const { setAttachments } = attachmentDialog;

  useEffect(() => {
    if (transfer && open) {
      // Defer state update to the next tick to avoid cascading renders
      queueMicrotask(() => {
        setFormData({
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          amount: new Prisma.Decimal(transfer.amount),
          date: new Date(transfer.date),
          reference: transfer.reference || "",
          description: transfer.description || "",
          attachmentIds: [],
        });

        if (transfer.journalEntry?.attachments) {
          setAttachments(
            transfer.journalEntry.attachments.map((a: any) => ({
              id: a.id,
              url: a.url,
              name: a.name,
              size: a.size,
              type: a.type,
            })),
          );
        } else {
          setAttachments([]);
        }
      });
    } else if (!transfer && open) {
      queueMicrotask(() => {
        setFormData({
          fromAccountId: "",
          toAccountId: "",
          amount: new Prisma.Decimal(0),
          date: new Date(),
          reference: "",
          description: "",
          attachmentIds: [],
        });
        setAttachments([]);
      });
    }
  }, [transfer, open, setAttachments]);

  const handleSubmit = () => {
    if (
      !formData.fromAccountId ||
      !formData.toAccountId ||
      formData.amount.lessThan(0)
    ) {
      toast({
        title: "Error",
        description: "Please select accounts and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      toast({
        title: "Error",
        description: "Cannot transfer to the same account",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        if (transfer) {
          await updateCashTransfer(transfer.id, {
            ...formData,
            attachmentIds: attachmentDialog.attachments.map((a) => a.id),
          });
          toast({
            title: "Success",
            description: "Transfer updated successfully",
          });
        } else {
          await createCashTransfer({
            ...formData,
            attachmentIds: attachmentDialog.attachments.map((a) => a.id),
          });
          toast({
            title: "Success",
            description: "Transfer recorded successfully",
          });
        }
        onSuccess();
        onOpenChange(false);
        if (!transfer) {
          setFormData({
            fromAccountId: "",
            toAccountId: "",
            amount: new Prisma.Decimal(0),
            date: new Date(),
            reference: "",
            description: "",
            attachmentIds: [],
          });
          attachmentDialog.setAttachments([]);
        }
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Something went wrong",
          variant: "destructive",
        });
      }
    });
  };

  const accountOptions = cashAccounts.map((acc) => ({
    label: acc.name,
    value: acc.id,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {viewOnly ? "View Transfer" : "Transfer Funds"}
          </DialogTitle>
          <DialogDescription>
            {viewOnly
              ? "View transfer details."
              : "Record a transfer between cash/bank accounts."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              label="From Account"
              value={formData.fromAccountId}
              onValueChange={(val) =>
                setFormData({ ...formData, fromAccountId: val })
              }
              options={accountOptions}
              placeholder="Select Source"
              disabled={viewOnly}
            />
            <CustomSelect
              label="To Account"
              value={formData.toAccountId}
              onValueChange={(val) =>
                setFormData({ ...formData, toAccountId: val })
              }
              options={accountOptions}
              placeholder="Select Destination"
              disabled={viewOnly}
            />
          </div>

          <div className="space-y-1">
            <Label>Amount</Label>
            <CurrencyInput
              value={formData.amount.toNumber()}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  amount: new Prisma.Decimal(val || 0),
                })
              }
              placeholder="0.00"
              disabled={viewOnly}
            />
          </div>

          <CustomInput
            label="Date"
            type="date"
            value={
              formData.date instanceof Date
                ? formData.date.toISOString().split("T")[0]
                : formData.date
            }
            onChange={(e) =>
              setFormData({ ...formData, date: new Date(e.target.value) })
            }
            disabled={viewOnly}
          />

          <CustomInput
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            placeholder="e.g. TRF-001"
            disabled={viewOnly}
          />

          <CustomTextarea
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            disabled={viewOnly}
          />

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={attachmentDialog.openDialog}
              disabled={viewOnly && attachmentDialog.attachments.length === 0}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {attachmentDialog.attachments.length > 0
                ? `${attachmentDialog.attachments.length} Attachment${
                    attachmentDialog.attachments.length > 1 ? "s" : ""
                  }`
                : "Add Attachments"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {viewOnly ? "Close" : "Cancel"}
          </Button>
          {!viewOnly && (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <AttachmentDialog
        {...attachmentDialog.dialogProps}
        uploadAction={uploadTransferAttachment}
      />
    </Dialog>
  );
}
