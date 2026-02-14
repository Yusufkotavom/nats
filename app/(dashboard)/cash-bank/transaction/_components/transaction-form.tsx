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
import { Plus, Trash2, Paperclip, Loader2, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CashTransactionType } from "@/prisma/generated/prisma/enums";
import { createCashTransaction, updateCashTransaction } from "../actions";
import {
  CashTransactionAllocationFormData,
  CashTransactionFormData,
} from "../types";
import { Account, CashAccount, Contact } from "@/prisma/generated/prisma/browser";
import { Department, Project } from "@/prisma/generated/prisma/client";
import { AttachmentDialog } from "@/components/ui/attachment-dialog";
import { NoteDialog } from "@/components/ui/note-dialog";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { useFormatCurrency } from "@/hooks";
import { useAttachmentDialog } from "@/hooks/use-attachment-dialog";
import { useNoteDialog } from "@/hooks/use-note-dialog";
import { SuperJSON } from "@/lib/superjson";
import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import { Label } from "@/components/ui/label";

interface TransactionFormProps {
  cashAccounts: CashAccount[];
  glAccounts: Account[];
  contacts: Contact[];
  departments?: Department[];
  projects?: Project[];
  onCancel?: () => void;
  initialData?: CashTransactionFormData & { id?: string };
  readOnly?: boolean;
}

export function TransactionForm({
  cashAccounts,
  glAccounts,
  contacts,
  departments,
  projects,
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
  const formatCurrency = useFormatCurrency();

  const attachmentDialog = useAttachmentDialog({
    initialAttachments: initialData?.attachments,
  });
  const noteDialog = useNoteDialog({ initialValue: initialData?.notes });

  const [formData, setFormData] = useState<CashTransactionFormData>(
    initialData
      ? {
        ...initialData,
        date: new Date(initialData.date), // Ensure date is Date object
        departmentId: initialData.departmentId,
        projectId: initialData.projectId,
      }
      : {
        date: new Date(),
        type: CashTransactionType.INCOME,
        cashAccountId: "",
        contactId: "",
        departmentId: undefined,
        projectId: undefined,
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
      const submitData = {
        ...formData,
        attachments: attachmentDialog.attachments,
        notes: noteDialog.note,
      };

      if (initialData?.id) {
        await updateCashTransaction(
          initialData.id,
          SuperJSON.serialize(submitData),
        );
        toast({
          title: "Success",
          description: "Transaction updated successfully",
        });
      } else {
        await createCashTransaction(SuperJSON.serialize(submitData));
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
    <PageFormLayout>
      <PageFormHeader>
        <PageFormTitle>
          {initialData?.id ? "Edit Cash Transaction" : "New Cash Transaction"}
        </PageFormTitle>
        <PageFormActions>
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
        </PageFormActions>
      </PageFormHeader>

      <PageFormContent className="space-y-8">
        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-1">
            <Label>Contact (Optional)</Label>
            <SearchableSelect
              value={formData.contactId}
              onValueChange={(val) =>
                setFormData({ ...formData, contactId: val || undefined })
              }
              options={contacts.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              placeholder="Select Contact"
              disabled={readOnly}
            />
          </div>
          <CustomInput
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            placeholder="Optional reference"
            disabled={readOnly}
          />
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

          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Department</Label>
              <SearchableSelect
                value={formData.departmentId || ""}
                onValueChange={(val) => setFormData({ ...formData, departmentId: val || undefined })}
                options={departments?.map(d => ({ value: d.id, label: d.name })) || []}
                placeholder="Select Department"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label>Project</Label>
              <SearchableSelect
                value={formData.projectId || ""}
                onValueChange={(val) => setFormData({ ...formData, projectId: val || undefined })}
                options={projects?.map(p => ({ value: p.id, label: p.name })) || []}
                placeholder="Select Project"
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Allocations Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Allocations</h2>

            {!readOnly && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleAddAllocation}>
                  <Plus className="mr-2 h-4 w-4" /> Add Line
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-md border">
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
          </div>

          <div className="flex justify-between bg-muted/20 rounded-md p-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={attachmentDialog.openDialog}
                disabled={readOnly} // For now disable in readOnly, ideally should be view only
              >
                <Paperclip className="mr-2 h-4 w-4" />
                {attachmentDialog.attachments.length > 0
                  ? `${attachmentDialog.attachments.length} Attachments`
                  : "Attach File"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={noteDialog.openDialog}
                disabled={readOnly} // For now disable in readOnly
              >
                <StickyNote className="mr-2 h-4 w-4" />
                {noteDialog.note ? "Edit Note" : "Add Note"}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <span>Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </PageFormContent>

      <AttachmentDialog
        {...attachmentDialog.dialogProps}
        uploadAction={uploadFile}
      />

      <NoteDialog {...noteDialog.dialogProps} />
    </PageFormLayout>
  );
}
