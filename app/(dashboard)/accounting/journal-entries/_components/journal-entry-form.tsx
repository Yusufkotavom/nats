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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Paperclip,
  X,
  StickyNote,
} from "lucide-react";
import { useFormatCurrency } from "@/hooks";
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
import { Account, Contact, Department, Project, Prisma } from "@/prisma/generated/prisma/browser";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { CreateJournalEntryData } from "../../types";
import { AttachmentDialog } from "@/components/ui/attachment-dialog";
import { NoteDialog } from "@/components/ui/note-dialog";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { MentionsList } from "./mentions-list";
import { generateId } from "@/lib/utils";
import { Decimal } from "decimal.js";
import {
  PageFormLayout,
  PageFormHeader,
  PageFormTitle,
  PageFormActions,
  PageFormContent,
} from "@/components/layout/page/form-layout";

interface JournalEntryFormProps {
  initialData?: CreateJournalEntryData;
  accounts: (Account & { children?: unknown[] })[];
  contacts: Contact[];
  departments?: Department[];
  projects?: Project[];
  onSubmit: (data: CreateJournalEntryData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function JournalEntryForm({
  initialData,
  accounts,
  contacts,
  departments = [],
  projects = [],
  onSubmit,
  isSubmitting,
  onCancel,
}: JournalEntryFormProps) {
  const formatCurrency = useFormatCurrency();
  const leafAccounts = accounts.filter((a) => a.isPosting);
  const [formData, setFormData] = useState<CreateJournalEntryData>(
    initialData as unknown as CreateJournalEntryData,
  );

  const [activeMention, setActiveMention] = useState<{
    lineIndex: number;
    query: string;
    rect: DOMRect;
    selectedIndex: number;
  } | null>(null);

  const handleDescriptionChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
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
      c.name.toLowerCase().includes(activeMention.query.toLowerCase()),
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
    if (!activeMention || !formData) return;
    const { lineIndex, query } = activeMention;
    const line = formData.lines[lineIndex];
    if (!line.description) return;

    const text = line.description;

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
    if (!formData) return;
    const newLines = [...formData.lines];
    newLines[index] = {
      ...newLines[index],
      contactId: null,
    };
    setFormData({ ...formData, lines: newLines });
  };

  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev: CreateJournalEntryData) => {
        const oldIndex = prev.lines.findIndex((item) => item.id === active.id);
        const newIndex = prev.lines.findIndex((item) => item.id === over.id);
        return {
          ...prev,
          lines: arrayMove(prev.lines, oldIndex, newIndex),
        };
      });
    }
  };

  const totalDebit = formData?.lines?.reduce((sum, line) => {
    const amount =
      line.debitAmount instanceof Decimal
        ? line.debitAmount
        : new Decimal(line.debitAmount || 0);
    return sum.add(amount);
  }, new Decimal(0));
  const totalCredit = formData?.lines?.reduce((sum, line) => {
    const amount =
      line.creditAmount instanceof Decimal
        ? line.creditAmount
        : new Decimal(line.creditAmount || 0);
    return sum.add(amount);
  }, new Decimal(0));
  const isBalanced = totalCredit.equals(totalDebit);

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

    const validLines = formData.lines.filter((l) => {
      const debit =
        l.debitAmount instanceof Decimal
          ? l.debitAmount.toNumber()
          : Number(l.debitAmount || 0);
      const credit =
        l.creditAmount instanceof Decimal
          ? l.creditAmount.toNumber()
          : Number(l.creditAmount || 0);
      return l.accountId && (debit > 0 || credit > 0);
    });

    if (validLines.length < 2) {
      setError("At least two lines with accounts and amounts are required");
      return;
    }

    await onSubmit(formData);
  };

  const updateLine = (
    index: number,
    field: string,
    value: string | Decimal,
  ) => {
    if (!formData) return;
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          id: generateId(),
          accountId: "",
          account: { name: "", code: "" },
          contact: null,
          department: null,
          project: null,
          contactId: null,
          departmentId: null,
          projectId: null,
          lineNumber: formData.lines.length,
          debitAmount: new Decimal(0),
          creditAmount: new Decimal(0),
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
    formData && (
      <PageFormLayout>
        <PageFormHeader>
          <PageFormTitle>
            {initialData?.entryNumber
              ? `Edit Journal Entry`
              : "New Journal Entry"}
          </PageFormTitle>
          <PageFormActions>
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
          </PageFormActions>
        </PageFormHeader>

        <PageFormContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">
              <CustomInput
                label="Entry No"
                id="entry_no"
                type="text"
                value={formData.entryNumber}
                readOnly
                disabled
                containerClassName="space-y-2"
              />
              <CustomInput
                label="Transaction Date"
                id="date"
                type="date"
                value={formData.transactionDate.toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    transactionDate: new Date(e.target.value),
                  })
                }
                required
                containerClassName="space-y-2"
              />
              <CustomInput
                label="Description"
                id="description"
                value={formData.description || ""}
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
                      <TableHead className="w-[150px]">Department</TableHead>
                      <TableHead className="w-[150px]">Project</TableHead>
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
                      items={formData.lines.map((l) => ({
                        ...l,
                        id: l.id || "",
                      }))}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.lines.map((line, index) => (
                        <SortableTableRow key={line.id} id={line.id || ""}>
                          <TableCell>
                            <SearchableSelect
                              value={line.accountId}
                              onValueChange={(val) =>
                                updateLine(index, "accountId", val || "")
                              }
                              placeholder="Search Account"
                              className="w-full border-0"
                              options={leafAccounts.map((account) => ({
                                value: account.id,
                                label: `${account.code} - ${account.name}`,
                              }))}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 w-full">
                              <input
                                value={line.description || ""}
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
                                    (c) => c.id === line.contactId,
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
                              value={
                                line.debitAmount instanceof Decimal
                                  ? line.debitAmount.toNumber()
                                  : Number(line.debitAmount || 0)
                              }
                              onChange={(val) =>
                                updateLine(
                                  index,
                                  "debitAmount",
                                  new Decimal(val),
                                )
                              }
                              onFocus={(e) => e.target.select()}
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              className="text-right border-0"
                              value={
                                line.creditAmount instanceof Decimal
                                  ? line.creditAmount.toNumber()
                                  : Number(line.creditAmount || 0)
                              }
                              onChange={(val) =>
                                updateLine(
                                  index,
                                  "creditAmount",
                                  new Decimal(val),
                                )
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
                      <TableCell colSpan={5} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalDebit.toNumber())}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalCredit.toNumber())}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {!isBalanced && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="font-bold text-red-600"
                        >
                          Difference
                        </TableCell>
                        <TableCell
                          colSpan={2}
                          className="text-right font-bold text-red-600"
                        >
                          {formatCurrency(
                            totalDebit.sub(totalCredit).toNumber(),
                          )}
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
                    {(formData.attachments?.length || 0) > 0
                      ? `${formData.attachments?.length} Attachments`
                      : "Attach File"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setIsNoteDialogOpen(true)}
                  >
                    <StickyNote className="mr-2 h-3 w-3" />
                    {formData.notes ? "Edit Note" : "Add Note"}
                  </Button>
                </div>

                <AttachmentDialog
                  open={isAttachmentDialogOpen}
                  onOpenChange={setIsAttachmentDialogOpen}
                  attachments={formData.attachments || []}
                  onAttachmentsChange={(newAttachments) => {
                    setFormData((prev) => ({
                      ...prev,
                      attachments:
                        newAttachments as CreateJournalEntryData["attachments"],
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
            </div>
          </form>
        </PageFormContent>
        {activeMention && activeMention.rect && (
          <MentionsList
            contacts={contacts.filter((c) =>
              c.name.toLowerCase().includes(activeMention.query.toLowerCase()),
            )}
            selectedIndex={activeMention.selectedIndex}
            onSelect={handleSelectContact}
            position={{
              top: activeMention.rect.bottom + 5,
              left: activeMention.rect.left,
            }}
          />
        )}
      </PageFormLayout>
    )
  );
}
