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
import { Loader2, Plus, Trash2, GripVertical, PlusIcon } from "lucide-react";
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  getPurchaseOrder,
} from "../actions";
import { PurchaseInvoiceWithDetails, PurchaseInvoiceInput } from "../types";
import { format } from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SortableTableRow } from "@/components/ui/sortable-row";

interface PurchaseInvoiceFormProps {
  invoice?: PurchaseInvoiceWithDetails;
  vendors: { id: string; name: string }[];
  purchaseOrders: {
    id: string;
    orderNumber: string;
    contactId: string;
    contact: { name: string };
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

export function PurchaseInvoiceForm({
  invoice,
  vendors,
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
    contactId: invoice?.contactId || "",
    purchaseOrderId: invoice?.purchaseOrderId || undefined,
    invoiceDate: invoice?.invoiceDate
      ? new Date(invoice.invoiceDate)
      : new Date(),
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
    notes: invoice?.notes || "",
    status: invoice?.status || "DRAFT",

    globalDiscount: Number(invoice?.globalDiscount) || 0,
    totalTax: Number(invoice?.totalTax) || 0,
    shippingCost: Number(invoice?.shippingCost) || 0,
    handlingCost: Number(invoice?.handlingCost) || 0,

    items:
      invoice?.items.map((item) => ({
        id: generateId(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
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
          setFormData((prev) => ({ ...prev, contactId: fullPo.contactId }));

          // Populate items from PO
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newItems = fullPo.items.map((item: any) => ({
            id: generateId(),
            description: item.product?.name || "Item",
            quantity: item.quantity, // Use original qty or remaining? Usually Bill matches PO.
            unitPrice: Number(item.unitCost),
            discount: 0,
            tax: 0,
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
        {
          id: generateId(),
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          tax: 0,
        },
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

  const calculateItemValues = (item: (typeof formData.items)[0]) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * ((item.discount || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * ((item.tax || 0) / 100);
    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, total };
  };

  useEffect(() => {
    const calculatedTotalTax = formData.items.reduce((sum, item) => {
      const { taxAmount } = calculateItemValues(item);
      return sum + taxAmount;
    }, 0);

    // Only update if different to avoid infinite loops (though strict equality check on float might be tricky, usually fine for setFormData)
    if (Math.abs(calculatedTotalTax - formData.totalTax) > 0.001) {
      setFormData((prev) => ({ ...prev, totalTax: calculatedTotalTax }));
    }
  }, [formData.items]);

  const itemsTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemValues(item).total,
    0
  );

  const itemsNetTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemValues(item).taxableAmount,
    0
  );

  const totalAmount =
    itemsTotal -
    (formData.globalDiscount || 0) +
    (formData.shippingCost || 0) +
    (formData.handlingCost || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber) {
      alert("Please enter invoice number");
      return;
    }
    if (!formData.contactId) {
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
  const filteredPurchaseOrders = formData.contactId
    ? purchaseOrders.filter((po) => po.contactId === formData.contactId)
    : purchaseOrders;

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          New Purchase Invoice
        </h2>
        <div className="flex gap-2">
          {!readonly && (
            <>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <CustomSelect
                  label="Purchase Order (Optional)"
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
                      <div className="flex items-center">
                        <span>{po.orderNumber}</span>
                        <span className="text-muted-foreground ml-2">
                          ({po.contact.name})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </CustomSelect>

                <CustomInput
                  label="Invoice Number"
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

                <CustomSelect
                  value={formData.contactId}
                  label="Vendor"
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      contactId: val,
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

                <CustomInput
                  label="Invoice Date"
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

                <CustomInput
                  label="Due Date"
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

                {isEditing && (
                  <CustomSelect
                    value={formData.status}
                    label="Status"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onValueChange={(val: any) =>
                      setFormData((prev) => ({ ...prev, status: val }))
                    }
                    disabled={
                      readonly ||
                      invoice.status === "PAID" ||
                      invoice.status === "CANCELED"
                    }
                  >
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="BILLED">Billed</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">
                      Partially Paid
                    </SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                  </CustomSelect>
                )}
                <CustomTextarea
                  label="Notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Add notes here..."
                  disabled={readonly}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Products</CardTitle>
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
                        <TableHead className="w-[120px]">
                          Discount (%)
                        </TableHead>
                        <TableHead className="w-[120px]">Tax (%)</TableHead>
                        <TableHead className="w-[100px]">Total</TableHead>
                        {!readonly && (
                          <TableHead className="w-[50px]"></TableHead>
                        )}
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
                              <CustomInput
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "discount",
                                    Number(e.target.value)
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <CustomInput
                                type="number"
                                min="0"
                                max="100"
                                value={item.tax}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "tax",
                                    Number(e.target.value)
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                                {calculateItemValues(
                                  item
                                ).total.toLocaleString()}
                              </div>
                            </TableCell>
                            {!readonly && (
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="mb-0.5"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            )}
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
                <div className="flex justify-between items-start p-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={readonly}
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <PlusIcon /> Add Item
                  </Button>
                  <div className="w-1/3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        Subtotal (Net)
                      </span>
                      <span>{itemsNetTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">
                        Global Discount
                      </span>
                      <CurrencyInput
                        value={formData.globalDiscount}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            globalDiscount: Number(val),
                          }))
                        }
                        disabled={readonly}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">Total Tax</span>
                      <CurrencyInput
                        value={formData.totalTax}
                        onChange={() => {}}
                        disabled={true}
                        className="w-24 h-8 bg-muted"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">Shipping</span>
                      <CurrencyInput
                        value={formData.shippingCost}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingCost: Number(val),
                          }))
                        }
                        disabled={readonly}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">Handling</span>
                      <CurrencyInput
                        value={formData.handlingCost}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            handlingCost: Number(val),
                          }))
                        }
                        disabled={readonly}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">Total</span>
                      <span className="font-bold">
                        {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
