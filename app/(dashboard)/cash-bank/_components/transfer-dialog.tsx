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
import { createCashTransfer, uploadTransferAttachment } from "../actions";
import { CashAccount, CashTransferFormData } from "../types";
import { Loader2, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import {
  AttachmentDialog,
  Attachment,
} from "@/components/ui/attachment-dialog";

interface CashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashAccounts: CashAccount[];
  onSuccess: () => void;
}

export function CashTransferDialog({
  open,
  onOpenChange,
  cashAccounts,
  onSuccess,
}: CashTransferDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CashTransferFormData>({
    fromAccountId: "",
    toAccountId: "",
    amount: 0,
    date: new Date(),
    reference: "",
    description: "",
    attachmentIds: [],
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (
      !formData.fromAccountId ||
      !formData.toAccountId ||
      formData.amount <= 0
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
        await createCashTransfer({
          ...formData,
          attachmentIds: attachments.map((a) => a.id),
        });
        toast({
          title: "Success",
          description: "Transfer recorded successfully",
        });
        onSuccess();
        onOpenChange(false);
        setFormData({
          fromAccountId: "",
          toAccountId: "",
          amount: 0,
          date: new Date(),
          reference: "",
          description: "",
          attachmentIds: [],
        });
        setAttachments([]);
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
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Record a transfer between cash/bank accounts.
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
            />
            <CustomSelect
              label="To Account"
              value={formData.toAccountId}
              onValueChange={(val) =>
                setFormData({ ...formData, toAccountId: val })
              }
              options={accountOptions}
              placeholder="Select Destination"
            />
          </div>

          <div className="space-y-1">
            <Label>Amount</Label>
            <CurrencyInput
              value={formData.amount}
              onChange={(val) =>
                setFormData({ ...formData, amount: parseFloat(val) || 0 })
              }
              placeholder="0.00"
            />
          </div>

          <CustomInput
            label="Date"
            type="date"
            value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
            onChange={(e) =>
              setFormData({ ...formData, date: new Date(e.target.value) })
            }
          />

          <CustomInput
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            placeholder="e.g. TRF-001"
          />

          <CustomTextarea
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAttachmentOpen(true)}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {attachments.length > 0
                ? `${attachments.length} Attachment${
                    attachments.length > 1 ? "s" : ""
                  }`
                : "Add Attachments"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>

      <AttachmentDialog
        open={isAttachmentOpen}
        onOpenChange={setIsAttachmentOpen}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        uploadAction={uploadTransferAttachment}
      />
    </Dialog>
  );
}
