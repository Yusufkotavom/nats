"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Trash2 } from "lucide-react";
import { CreateJournalEntryData } from "../actions";
import { Account } from "@prisma/client";

interface JournalEntryFormProps {
  initialData?: CreateJournalEntryData;
  accounts: (Account & { children?: unknown[] })[];
  onSubmit: (data: CreateJournalEntryData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function JournalEntryForm({
  initialData,
  accounts,
  onSubmit,
  isSubmitting,
  onCancel,
}: JournalEntryFormProps) {
  const leafAccounts = accounts.filter(
    (a) => !a.children || a.children.length === 0
  );
  const [transactionDate, setTransactionDate] = useState<string>(
    initialData?.transactionDate
      ? new Date(initialData.transactionDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [lines, setLines] = useState<
    {
      accountId: string;
      debitAmount: string;
      creditAmount: string;
      description: string;
    }[]
  >(
    initialData?.lines.map((l) => ({
      accountId: l.accountId,
      debitAmount: l.debitAmount.toString(),
      creditAmount: l.creditAmount.toString(),
      description: l.description || "",
    })) || [
      { accountId: "", debitAmount: "0", creditAmount: "0", description: "" },
      { accountId: "", debitAmount: "0", creditAmount: "0", description: "" },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalDebit = lines.reduce(
    (sum, line) => sum + (parseFloat(line.debitAmount) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (sum, line) => sum + (parseFloat(line.creditAmount) || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!transactionDate) {
      setError("Transaction date is required");
      return;
    }

    if (!isBalanced) {
      setError("Journal entry must be balanced (Total Debit = Total Credit)");
      return;
    }

    const validLines = lines.filter(
      (l) =>
        l.accountId &&
        (parseFloat(l.debitAmount) > 0 || parseFloat(l.creditAmount) > 0)
    );

    if (validLines.length < 2) {
      setError("At least two lines with accounts and amounts are required");
      return;
    }

    await onSubmit({
      transactionDate: new Date(transactionDate),
      description,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debitAmount: parseFloat(l.debitAmount) || 0,
        creditAmount: parseFloat(l.creditAmount) || 0,
        description: l.description,
      })),
    });
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Auto-clear other side if one side is entered
    if (field === "debitAmount" && parseFloat(value) > 0) {
      newLines[index].creditAmount = "0";
    }
    if (field === "creditAmount" && parseFloat(value) > 0) {
      newLines[index].debitAmount = "0";
    }

    setLines(newLines);
  };

  const addLine = () => {
    setLines([
      ...lines,
      { accountId: "", debitAmount: "0", creditAmount: "0", description: "" },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  // Initialize account search state is handled in useState initializer now
  useEffect(() => {
    if (initialData) {
      // Logic moved to useState initializer
    }
  }, [initialData, accounts]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Transaction Date</Label>
          <Input
            id="date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 flex-1">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Journal entry description"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[150px] text-right">Debit</TableHead>
              <TableHead className="w-[150px] text-right">Credit</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={line.accountId}
                    onValueChange={(val) => updateLine(index, "accountId", val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {leafAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    placeholder="Line description"
                  />
                </TableCell>
                <TableCell>
                  <CurrencyInput
                    className="text-right"
                    value={line.debitAmount}
                    onChange={(val) => updateLine(index, "debitAmount", val)}
                    onFocus={(e) => e.target.select()}
                  />
                </TableCell>
                <TableCell>
                  <CurrencyInput
                    className="text-right"
                    value={line.creditAmount}
                    onChange={(val) => updateLine(index, "creditAmount", val)}
                    onFocus={(e) => e.target.select()}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-bold">
                Total
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatNumber(totalDebit)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatNumber(totalCredit)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
            {!isBalanced && (
              <TableRow>
                <TableCell colSpan={2} className="font-bold text-red-600">
                  Difference
                </TableCell>
                <TableCell
                  colSpan={2}
                  className="text-right font-bold text-red-600"
                >
                  {formatNumber(totalDebit - totalCredit)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableFooter>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={addLine}>
          <Plus className="mr-2 h-4 w-4" /> Add Line
        </Button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isBalanced}>
          {isSubmitting ? "Saving..." : "Save Journal Entry"}
        </Button>
      </div>
    </form>
  );
}
