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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CashTransactionType } from "@/prisma/generated/prisma/enums";
import { createCashTransaction } from "../actions";
import {
  CashTransactionAllocationFormData,
  CashTransactionFormData,
} from "../types";
import { Account, CashAccount } from "@/prisma/generated/prisma/browser";
import { uploadTransferAttachment } from "../../actions";
import { Label } from "@/components/ui/label";

interface TransactionFormProps {
  cashAccounts: CashAccount[];
  glAccounts: Account[];
  onCancel?: () => void;
}

export function TransactionForm({
  cashAccounts,
  glAccounts,
  onCancel,
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
  const [formData, setFormData] = useState<CashTransactionFormData>({
    date: new Date(),
    type: CashTransactionType.INCOME,
    cashAccountId: "",
    allocations: [],
    attachmentIds: [],
    reference: "",
    description: "",
  });

  const [attachments, setAttachments] = useState<
    { id: string; name: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);

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
    value: any
  ) => {
    const newAllocations = [...formData.allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setFormData((prev) => ({ ...prev, allocations: newAllocations }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);

    const files = Array.from(e.target.files);
    try {
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        const result = await uploadTransferAttachment(data);
        if (result.success) {
          setAttachments((prev) => [...prev, result.file]);
          setFormData((prev) => ({
            ...prev,
            attachmentIds: [...prev.attachmentIds, result.file.id],
          }));
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
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
      if (formData.attachmentIds.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please upload at least one attachment",
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
      await createCashTransaction(formData);

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
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">New Cash Transaction</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Details */}
        <div className="space-y-4 rounded-lg border p-4 bg-card">
          <h2 className="text-lg font-semibold">Transaction Details</h2>
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
          />
          <CustomInput
            label="Reference"
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            placeholder="Optional reference"
          />
          <CustomInput
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Transaction description"
          />
        </div>

        {/* Right Column: Attachments */}
        <div className="space-y-4 rounded-lg border p-4 bg-card">
          <h2 className="text-lg font-semibold">Attachments (Required)</h2>
          <div className="space-y-2">
            <Label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center gap-2 rounded-md border bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
            >
              <Paperclip className="h-4 w-4" />
              Upload Files
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </Label>
            {isUploading && (
              <span className="text-sm text-muted-foreground ml-2">
                Uploading...
              </span>
            )}
          </div>

          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-sm"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No files uploaded.</p>
          )}
        </div>
      </div>

      {/* Allocations Table */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Allocations</h2>
          <Button variant="outline" size="sm" onClick={handleAddAllocation}>
            <Plus className="mr-2 h-4 w-4" /> Add Line
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Account</TableHead>
              <TableHead className="w-[30%]">Description</TableHead>
              <TableHead className="text-right w-[20%]">Amount</TableHead>
              <TableHead className="w-[10%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.allocations.map((alloc, index) => (
              <TableRow key={index}>
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
                  />
                </TableCell>
                <TableCell>
                  <CustomInput
                    value={alloc.description || ""}
                    onChange={(e) =>
                      updateAllocation(index, "description", e.target.value)
                    }
                    placeholder="Line description"
                  />
                </TableCell>
                <TableCell>
                  <CurrencyInput
                    value={alloc.amount}
                    onChange={(val) => updateAllocation(index, "amount", val)}
                    className="text-right"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAllocation(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {formData.allocations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground h-24"
                >
                  No allocations added. Click &quot;Add Line&quot; to start.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex justify-end mt-4 p-4 bg-muted/20 rounded-md">
          <div className="flex items-center gap-4 text-lg font-bold">
            <span>Total:</span>
            <span>{totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
