"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Paperclip,
  Loader2,
  StickyNote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CashTransactionType } from "@/prisma/generated/prisma/enums";
import { createCashTransaction, updateCashTransaction } from "../actions";
import {
  CashTransactionAllocationFormData,
  CashTransactionFormData,
  Attachment,
} from "../types";
import { Account, CashAccount } from "@/prisma/generated/prisma/browser";
import { AttachmentDialog } from "@/components/ui/attachment-dialog";
import { NoteDialog } from "@/components/ui/note-dialog";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { useFormatCurrency } from "@/hooks";

interface TransactionFormProps {
  cashAccounts: CashAccount[];
  glAccounts: Account[];
  onCancel?: () => void;
  initialData?: CashTransactionFormData & { id?: string };
  readOnly?: boolean;
}

export function TransactionForm({
  cashAccounts,
  glAccounts,
  onCancel,
  initialData,
  readOnly = false,
}: TransactionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/cash-bank/transaction");
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const formatCurrency = useFormatCurrency();

  const [formData, setFormData] = useState<CashTransactionFormData>(
    initialData
      ? {
          ...initialData,
          date: new Date(initialData.date), // Ensure date is Date object
        }
      : {
          date: new Date(),
          type: CashTransactionType.INCOME,
          cashAccountId: "",
          allocations: [],
          attachments: [],
          notes: "",
          reference: "",
          description: "",
        },
  );

  const handleAddAllocation = () => {
    setFormData((prev) => ({
      ...prev,
      allocations: [
        ...prev.allocations,
        { accountId: "", amount: 0, description: "" },
      ],
    }));
  };

  const handleRemoveAllocation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      allocations: prev.allocations.filter((_, i) => i !== index),
    }));
  };

  const updateAllocation = (
    index: number,
    field: keyof CashTransactionAllocationFormData,
    value: any,
  ) => {
    const newAllocations = [...formData.allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setFormData((prev) => ({ ...prev, allocations: newAllocations }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.cashAccountId) {
        toast({
          title: "Validation Error",
          description: "Please select a cash account",
          variant: "destructive",
        });
        return;
      }
      if (formData.allocations.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one allocation",
          variant: "destructive",
        });
        return;
      }

      // Check if allocations have accountId and amount > 0
      for (const alloc of formData.allocations) {
        if (!alloc.accountId) {
          toast({
            title: "Validation Error",
            description: "All allocations must have an account selected",
            variant: "destructive",
          });
          return;
        }
        if (Number(alloc.amount) <= 0) {
          toast({
            title: "Validation Error",
            description: "Allocation amount must be greater than 0",
            variant: "destructive",
          });
          return;
        }
      }

      setIsSubmitting(true);
      if (initialData?.id) {
        await updateCashTransaction(initialData.id, formData);
        toast({
          title: "Success",
          description: "Transaction updated successfully",
        });
      } else {
        await createCashTransaction(formData);
        toast({
          title: "Success",
          description: "Transaction created successfully",
        });
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      await queryClient.invalidateQueries({
        queryKey: ["cash-bank", "dashboard-stats"],
      });

      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
      router.push("/cash-bank/transaction");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = formData.allocations.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">
            {initialData?.id ? "Edit Cash Transaction" : "New Cash Transaction"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {readOnly ? "Back" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Transaction
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-3 gap-4">
          <CustomSelect
            label="Type"
            value={formData.type}
            onValueChange={(val) =>
              setFormData({ ...formData, type: val as CashTransactionType })
            }
            options={[
              { label: "Revenue (In)", value: CashTransactionType.INCOME },
              { label: "Expense (Out)", value: CashTransactionType.EXPENSE },
            ]}
            disabled={readOnly}
          />
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
            disabled={readOnly}
          />
          <CustomInput
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            placeholder="Optional reference"
            disabled={readOnly}
          />
        </div>
        <CustomSelect
          label="Cash/Bank Account"
          value={formData.cashAccountId}
          onValueChange={(val) =>
            setFormData({ ...formData, cashAccountId: val })
          }
          options={cashAccounts.map((acc) => ({
            label: acc.name,
            value: acc.id,
          }))}
          placeholder="Select Account"
          disabled={readOnly}
        />

        <CustomInput
          label="Description"
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Transaction description"
          disabled={readOnly}
        />
      </div>

      {/* Allocations Table */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Allocations</h2>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddAllocation}>
                <Plus className="mr-2 h-4 w-4" /> Add Line
              </Button>
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Description</TableHead>
              <TableHead className="w-[40%]">Account</TableHead>
              <TableHead className="w-[25%]">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.allocations.map((alloc, index) => (
              <TableRow key={index}>
                <TableCell>
                  <CustomInput
                    value={alloc.description || ""}
                    onChange={(e) =>
                      updateAllocation(index, "description", e.target.value)
                    }
                    placeholder="Line description"
                    disabled={readOnly}
                  />
                </TableCell>
                <TableCell>
                  <SearchableSelect
                    options={glAccounts.map((acc) => ({
                      label: `${acc.code} - ${acc.name}`,
                      value: acc.id,
                    }))}
                    value={alloc.accountId}
                    onValueChange={(val) =>
                      updateAllocation(index, "accountId", val)
                    }
                    placeholder="Select GL Account"
                    disabled={readOnly}
                  />
                </TableCell>

                <TableCell className="flex">
                  <CurrencyInput
                    value={alloc.amount}
                    onChange={(val) => updateAllocation(index, "amount", val)}
                    className="text-right"
                    disabled={readOnly}
                  />
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAllocation(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {formData.allocations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground h-24"
                >
                  {readOnly
                    ? "No allocations found."
                    : 'No allocations added. Click "Add Line" to start.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex justify-between mt-4 bg-muted/20 rounded-md">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAttachmentDialogOpen(true)}
              disabled={readOnly} // For now disable in readOnly, ideally should be view only
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {formData.attachments.length > 0
                ? `${formData.attachments.length} Attachments`
                : "Attach File"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNoteDialogOpen(true)}
              disabled={readOnly} // For now disable in readOnly
            >
              <StickyNote className="mr-2 h-4 w-4" />
              {formData.notes ? "Edit Note" : "Add Note"}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <span>Total:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      <AttachmentDialog
        open={isAttachmentDialogOpen}
        onOpenChange={setIsAttachmentDialogOpen}
        attachments={formData.attachments}
        onAttachmentsChange={(newAttachments) => {
          setFormData((prev) => ({
            ...prev,
            attachments: newAttachments as Attachment[],
          }));
        }}
        uploadAction={uploadFile}
      />

      <NoteDialog
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
        value={formData.notes || ""}
        onChange={(val) => setFormData({ ...formData, notes: val })}
      />
    </div>
  );
}
