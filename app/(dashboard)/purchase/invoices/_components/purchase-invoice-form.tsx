"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  getPurchaseOrder,
} from "../actions";
import { PurchaseInvoiceWithDetails, PurchaseInvoiceInput } from "../types";
import { format } from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";

interface PurchaseInvoiceFormProps {
  invoice?: PurchaseInvoiceWithDetails;
  vendors: { id: string; name: string }[];
  accounts: { id: string; code: string; name: string }[];
  purchaseOrders: {
    id: string;
    orderNumber: string;
    vendorId: string;
    vendor: { name: string };
    items?: {
      quantity: number;
      unitCost: number; // or Decimal? Prisma Decimal comes as string or Decimal object usually, but serialized as number or string.
      // Assuming serialized to number in actions.
      product?: { name: string };
    }[];
  }[];
  readonly?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

function SortableTableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-[40px]">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-move"
          {...listeners}
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export function PurchaseInvoiceForm({
  invoice,
  vendors,
  accounts,
  purchaseOrders,
  readonly = false,
}: PurchaseInvoiceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!invoice;

  const [formData, setFormData] = useState<
    Omit<PurchaseInvoiceInput, "items"> & {
      items: (PurchaseInvoiceInput["items"][0] & { id: string })[];
    }
  >({
    invoiceNumber: invoice?.invoiceNumber || "",
    vendorId: invoice?.vendorId || "",
    purchaseOrderId: invoice?.purchaseOrderId || undefined,
    invoiceDate: invoice?.invoiceDate
      ? new Date(invoice.invoiceDate)
      : new Date(),
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
    notes: invoice?.notes || "",
    status: invoice?.status || "DRAFT",
    items:
      invoice?.items.map((item) => ({
        id: generateId(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        accountId: item.accountId || undefined,
      })) || [],
  });

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
        const oldIndex = prev.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.items.findIndex((item) => item.id === over.id);
        return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
      });
    }
  };

  // When Purchase Order is selected, populate items
  const handlePurchaseOrderChange = async (poId: string) => {
    setFormData((prev) => ({ ...prev, purchaseOrderId: poId }));

    if (poId) {
      try {
        const po = purchaseOrders.find((p) => p.id === poId);
        // Note: We might need to fetch full PO details if items are not passed fully,
        // but here we rely on purchaseOrders prop or fetch if needed.
        // Actually getPurchaseOrder action is available.
        const fullPo = await getPurchaseOrder(poId);

        if (fullPo) {
          // Auto-select vendor
          setFormData((prev) => ({ ...prev, vendorId: fullPo.vendorId }));

          // Populate items from PO
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newItems = fullPo.items.map((item: any) => ({
            id: generateId(),
            description: item.product?.name || "Item",
            quantity: item.quantity, // Use original qty or remaining? Usually Bill matches PO.
            unitPrice: Number(item.unitCost),
            accountId: undefined, // User needs to select account (e.g. Inventory Asset)
          }));

          setFormData((prev) => ({ ...prev, items: newItems }));
        }
      } catch (error) {
        console.error("Failed to fetch PO details", error);
      }
    }
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: generateId(), description: "", quantity: 1, unitPrice: 0 },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof (typeof formData.items)[0],
    value: string | number | undefined
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber) {
      alert("Please enter invoice number");
      return;
    }
    if (!formData.vendorId) {
      alert("Please select a vendor");
      return;
    }
    if (formData.items.length === 0) {
      alert("Please add at least one item");
      return;
    }
    for (const item of formData.items) {
      if (!item.description) {
        alert("Please enter description for all items");
        return;
      }
      if (item.quantity <= 0) {
        alert("Quantity must be greater than 0");
        return;
      }
    }

    setIsLoading(true);
    try {
      const submissionData = {
        ...formData,
        items: formData.items.map(({ id, ...item }) => item),
      };
      let result;
      if (isEditing && invoice) {
        result = await updatePurchaseInvoice(invoice.id, submissionData);
      } else {
        result = await createPurchaseInvoice(submissionData);
      }

      if (result.success) {
        router.push("/purchase/invoices");
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter purchase orders based on selected vendor
  const filteredPurchaseOrders = formData.vendorId
    ? purchaseOrders.filter((po) => po.vendorId === formData.vendorId)
    : purchaseOrders;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <CustomSelect
                  value={formData.vendorId}
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      vendorId: val,
                      purchaseOrderId: undefined,
                    }));
                  }}
                  placeholder="Select Vendor"
                  disabled={readonly || !!formData.purchaseOrderId}
                >
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </CustomSelect>
              </div>

              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <CustomInput
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      invoiceNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g. INV-001"
                  disabled={readonly}
                />
              </div>

              <div className="space-y-2">
                <Label>Purchase Order (Optional)</Label>
                <CustomSelect
                  value={formData.purchaseOrderId || "none"}
                  onValueChange={(val) =>
                    handlePurchaseOrderChange(val === "none" ? "" : val)
                  }
                  placeholder="Select Purchase Order"
                  disabled={readonly}
                >
                  <SelectItem value="none">None</SelectItem>
                  {filteredPurchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.orderNumber} ({po.vendor.name})
                    </SelectItem>
                  ))}
                </CustomSelect>
              </div>

              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <CustomInput
                  type="date"
                  value={
                    formData.invoiceDate
                      ? format(formData.invoiceDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      invoiceDate: e.target.value
                        ? new Date(e.target.value)
                        : new Date(),
                    }))
                  }
                  disabled={readonly}
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <CustomInput
                  type="date"
                  value={
                    formData.dueDate
                      ? format(formData.dueDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: e.target.value
                        ? new Date(e.target.value)
                        : new Date(),
                    }))
                  }
                  disabled={readonly}
                />
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <CustomSelect
                    value={formData.status}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onValueChange={(val: any) =>
                      setFormData((prev) => ({ ...prev, status: val }))
                    }
                    disabled={
                      readonly ||
                      invoice.status === "PAID" ||
                      invoice.status === "VOID"
                    }
                  >
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="POSTED">Posted</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="VOID">Void</SelectItem>
                  </CustomSelect>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              {!readonly && (
                <Button type="button" size="sm" onClick={handleAddItem}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[200px]">Account</TableHead>
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="w-[120px]">Unit Price</TableHead>
                      <TableHead className="w-[100px]">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={formData.items}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.items.map((item, index) => (
                        <SortableTableRow key={item.id} id={item.id}>
                          <TableCell>
                            <CustomInput
                              value={item.description}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              disabled={readonly}
                            />
                          </TableCell>
                          <TableCell>
                            <CustomSelect
                              value={item.accountId || "none"}
                              onValueChange={(val) =>
                                handleItemChange(
                                  index,
                                  "accountId",
                                  val === "none" ? undefined : val
                                )
                              }
                              disabled={readonly}
                            >
                              <SelectItem value="none">
                                Select Account
                              </SelectItem>
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                            </CustomSelect>
                          </TableCell>
                          <TableCell>
                            <CustomInput
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              disabled={readonly}
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              value={item.unitPrice}
                              onChange={(val) =>
                                handleItemChange(
                                  index,
                                  "unitPrice",
                                  Number(val)
                                )
                              }
                              disabled={readonly}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                              {(
                                item.quantity * item.unitPrice
                              ).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {!readonly && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="mb-0.5"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </TableCell>
                        </SortableTableRow>
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
              {formData.items.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No items added.
                </div>
              )}
              <div className="flex justify-end p-4 border-t">
                <div className="text-lg font-bold">
                  Total: {totalAmount.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Notes</Label>
            <CustomTextarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add notes here..."
              disabled={readonly}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!readonly && (
                <>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isEditing ? "Update Invoice" : "Create Invoice"}
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
