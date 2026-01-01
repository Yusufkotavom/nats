"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { CustomSelect } from "@/components/ui/custom-select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Trash2, Save, ArrowLeft, Paperclip, X } from "lucide-react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Account, Contact } from "@/prisma/generated/prisma/browser";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { CreateJournalEntryData } from "../../types";
import { AttachmentDialog } from "@/components/ui/attachment-dialog";
import { SortableTableRow } from "@/components/ui/sortable-row";

interface MentionsListProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  position: { top: number; left: number };
  selectedIndex: number;
}

function MentionsList({
  contacts,
  onSelect,
  position,
  selectedIndex,
}: MentionsListProps) {
  if (contacts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
      className="bg-popover text-popover-foreground border rounded-md shadow-md max-h-[200px] overflow-auto w-[200px]"
    >
      {contacts.map((c, index) => (
        <div
          key={c.id}
          className={`p-2 text-sm cursor-pointer ${
            index === selectedIndex ? "bg-muted" : "hover:bg-muted"
          }`}
          onClick={() => onSelect(c)}
          ref={(el) => {
            if (index === selectedIndex && el) {
              el.scrollIntoView({ block: "nearest" });
            }
          }}
        >
          {c.name}
        </div>
      ))}
    </div>
  );
}

interface JournalEntryFormProps {
  initialData?: CreateJournalEntryData;
  accounts: (Account & { children?: unknown[] })[];
  contacts: Contact[];
  onSubmit: (data: CreateJournalEntryData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function JournalEntryForm({
  initialData,
  accounts,
  contacts,
  onSubmit,
  isSubmitting,
  onCancel,
}: JournalEntryFormProps) {
  const formatCurrency = useFormatCurrency();
  const leafAccounts = accounts.filter(
    (a) => !a.children || a.children.length === 0
  );
  const [formData, setFormData] = useState<{
    transactionDate: string;
    entryNumber: string;
    description: string;
    lines: {
      id: string;
      accountId: string;
      debitAmount: string;
      creditAmount: string;
      description: string;
      contactId?: string;
    }[];
    attachments: { id: string; name: string; url: string }[];
  }>(() => ({
    transactionDate: initialData?.transactionDate
      ? new Date(initialData.transactionDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    description: initialData?.description || "",
    entryNumber: initialData?.entryNumber || "",
    lines:
      initialData?.lines.map((l) => ({
        id: generateId(),
        accountId: l.accountId,
        debitAmount: l.debitAmount.toString(),
        creditAmount: l.creditAmount.toString(),
        description: l.description || "",
        contactId: l.contactId,
      })) ||
      Array.from({ length: 2 }, (_, i) => ({
        id: generateId(),
        accountId: "",
        debitAmount: "0",
        creditAmount: "0",
        description: "",
        contactId: undefined,
      })),
    attachments: initialData?.attachments || [],
  }));

  const [activeMention, setActiveMention] = useState<{
    lineIndex: number;
    query: string;
    rect: DOMRect;
    selectedIndex: number;
  } | null>(null);

  const handleDescriptionChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    updateLine(index, "description", value);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const query = textBeforeCursor.slice(lastAt + 1);
      const charBeforeAt = lastAt > 0 ? textBeforeCursor[lastAt - 1] : " ";
      if (charBeforeAt === " " || lastAt === 0) {
        const rect = e.target.getBoundingClientRect();
        setActiveMention({ lineIndex: index, query, rect, selectedIndex: 0 });
        return;
      }
    }
    setActiveMention(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeMention) return;

    const filtered = contacts.filter((c) =>
      c.name.toLowerCase().includes(activeMention.query.toLowerCase())
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveMention((prev) => {
        if (!prev) return null;
        const nextIndex =
          prev.selectedIndex + 1 >= filtered.length
            ? 0
            : prev.selectedIndex + 1;
        return { ...prev, selectedIndex: nextIndex };
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveMention((prev) => {
        if (!prev) return null;
        const nextIndex =
          prev.selectedIndex - 1 < 0
            ? filtered.length - 1
            : prev.selectedIndex - 1;
        return { ...prev, selectedIndex: nextIndex };
      });
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filtered.length > 0) {
        e.preventDefault();
        handleSelectContact(filtered[activeMention.selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setActiveMention(null);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    if (!activeMention) return;
    const { lineIndex, query } = activeMention;
    const line = formData.lines[lineIndex];
    const text = line.description;

    // Find the @query position again to be safe
    // Note: this is a simple replacement, might be buggy if multiple same queries exist
    // But since we track from cursor, it should be fine if we assume the one before cursor.
    // However, we don't have cursor pos here easily.
    // Let's assume the last occurrence of @query

    // Better: use the text we had when detecting?
    // Let's just replace the last occurrence of @query
    const lastAt = text.lastIndexOf("@" + query);

    if (lastAt !== -1) {
      // Remove the @query part entirely to show chip instead
      const newText =
        text.slice(0, lastAt) + text.slice(lastAt + 1 + query.length);

      const newLines = [...formData.lines];
      newLines[lineIndex] = {
        ...newLines[lineIndex],
        description: newText,
        contactId: contact.id,
      };
      setFormData({ ...formData, lines: newLines });
    }
    setActiveMention(null);
  };

  const removeContact = (index: number) => {
    const newLines = [...formData.lines];
    newLines[index] = {
      ...newLines[index],
      contactId: undefined,
    };
    setFormData({ ...formData, lines: newLines });
  };

  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.lines.findIndex((item) => item.id === active.id);
        const newIndex = prev.lines.findIndex((item) => item.id === over.id);
        return {
          ...prev,
          lines: arrayMove(prev.lines, oldIndex, newIndex),
        };
      });
    }
  };

  const formatNumber = (value: number) => {
    return formatCurrency(value);
  };

  const totalDebit = formData.lines.reduce(
    (sum, line) => sum + (parseFloat(line.debitAmount) || 0),
    0
  );
  const totalCredit = formData.lines.reduce(
    (sum, line) => sum + (parseFloat(line.creditAmount) || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.transactionDate) {
      setError("Transaction date is required");
      return;
    }

    if (!isBalanced) {
      setError("Journal entry must be balanced (Total Debit = Total Credit)");
      return;
    }

    const validLines = formData.lines.filter(
      (l) =>
        l.accountId &&
        (parseFloat(l.debitAmount) > 0 || parseFloat(l.creditAmount) > 0)
    );

    if (validLines.length < 2) {
      setError("At least two lines with accounts and amounts are required");
      return;
    }

    await onSubmit({
      transactionDate: new Date(formData.transactionDate),
      description: formData.description,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debitAmount: parseFloat(l.debitAmount) || 0,
        creditAmount: parseFloat(l.creditAmount) || 0,
        description: l.description,
        contactId: l.contactId,
      })),
      attachments: formData.attachments,
    });
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Auto-clear other side if one side is entered
    if (field === "debitAmount" && parseFloat(value) > 0) {
      newLines[index].creditAmount = "0";
    }
    if (field === "creditAmount" && parseFloat(value) > 0) {
      newLines[index].debitAmount = "0";
    }

    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          id: generateId(),
          accountId: "",
          debitAmount: "0",
          creditAmount: "0",
          description: "",
        },
      ],
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 2) return;
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  // Initialize account search state is handled in useState initializer now
  useEffect(() => {
    if (initialData) {
      // Logic moved to useState initializer
    }
  }, [initialData, accounts]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {initialData?.id ? `Edit Journal Entry` : "New Journal Entry"}
          </h2>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <ArrowLeft />
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !isBalanced}
          >
            <Save />
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4">
            <CustomInput
              label="Entry No"
              id="date"
              type="date"
              value={formData.entryNumber}
              readOnly
              containerClassName="space-y-2"
            />
            <CustomInput
              label="Transaction Date"
              id="date"
              type="date"
              value={formData.transactionDate}
              onChange={(e) =>
                setFormData({ ...formData, transactionDate: e.target.value })
              }
              required
              containerClassName="space-y-2"
            />
            <CustomInput
              label="Description"
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="General transaction description"
              containerClassName="space-y-2 flex-1"
            />
          </div>

          <div className="rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[300px]">Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[150px] text-right">
                      Debit
                    </TableHead>
                    <TableHead className="w-[150px] text-right">
                      Credit
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={formData.lines}
                    strategy={verticalListSortingStrategy}
                  >
                    {formData.lines.map((line, index) => (
                      <SortableTableRow key={line.id} id={line.id}>
                        <TableCell>
                          <CustomSelect
                            value={line.accountId}
                            onValueChange={(val) =>
                              updateLine(index, "accountId", val)
                            }
                            placeholder="Select account"
                            triggerClassName="w-full border-0"
                            options={leafAccounts.map((account) => ({
                              value: account.id,
                              label: `${account.code} - ${account.name}`,
                            }))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 w-full">
                            <input
                              value={line.description}
                              onChange={(e) =>
                                handleDescriptionChange(index, e)
                              }
                              onKeyDown={handleKeyDown}
                              className="flex-1 bg-transparent border-0 outline-none text-sm h-8 w-full placeholder:text-muted-foreground"
                              placeholder="Detailed description (@ to mention)"
                            />
                            {line.contactId &&
                              (() => {
                                const contact = contacts.find(
                                  (c) => c.id === line.contactId
                                );
                                if (!contact) return null;

                                let badgeClass =
                                  "bg-gray-100 text-gray-800 hover:bg-gray-200";
                                if (contact.type === "CUSTOMER") {
                                  badgeClass =
                                    "bg-blue-100 text-blue-800 hover:bg-blue-200";
                                } else if (contact.type === "VENDOR") {
                                  badgeClass =
                                    "bg-orange-100 text-orange-800 hover:bg-orange-200";
                                } else if (contact.type === "EMPLOYEE") {
                                  badgeClass =
                                    "bg-green-100 text-green-800 hover:bg-green-200";
                                }

                                return (
                                  <Badge
                                    variant="secondary"
                                    className={`shrink-0 h-6 pr-1 gap-1 cursor-default ${badgeClass}`}
                                  >
                                    <span className="truncate max-w-[120px]">
                                      {contact.name}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 hover:bg-black/10 text-current p-0 rounded-full"
                                      onClick={() => removeContact(index)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                );
                              })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CurrencyInput
                            className="text-right border-0"
                            value={line.debitAmount}
                            onChange={(val) =>
                              updateLine(index, "debitAmount", val)
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </TableCell>
                        <TableCell>
                          <CurrencyInput
                            className="text-right border-0"
                            value={line.creditAmount}
                            onChange={(val) =>
                              updateLine(index, "creditAmount", val)
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(index)}
                            disabled={formData.lines.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </SortableTableRow>
                    ))}
                  </SortableContext>
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-bold">
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
                      <TableCell colSpan={3} className="font-bold text-red-600">
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
            </DndContext>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-start border-t pt-4">
            <div className="flex items-start gap-2">
              <Button type="button" variant="outline" onClick={addLine}>
                <Plus className="mr-2 h-4 w-4" /> Add Line
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsAttachmentDialogOpen(true)}
                >
                  <Paperclip className="mr-2 h-3 w-3" />
                  {formData.attachments.length > 0
                    ? `${formData.attachments.length} Attachments`
                    : "Attach File"}
                </Button>
              </div>

              <AttachmentDialog
                open={isAttachmentDialogOpen}
                onOpenChange={setIsAttachmentDialogOpen}
                attachments={formData.attachments}
                onAttachmentsChange={(newAttachments) => {
                  setFormData((prev) => ({
                    ...prev,
                    attachments: newAttachments,
                  }));
                }}
                uploadAction={uploadFile}
              />
            </div>
          </div>
        </form>
      </div>
      {activeMention && activeMention.rect && (
        <MentionsList
          contacts={contacts.filter((c) =>
            c.name.toLowerCase().includes(activeMention.query.toLowerCase())
          )}
          selectedIndex={activeMention.selectedIndex}
          onSelect={handleSelectContact}
          position={{
            top: activeMention.rect.bottom + 5,
            left: activeMention.rect.left,
          }}
        />
      )}
    </div>
  );
}
