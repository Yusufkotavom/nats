"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { Plus, Trash2, ArrowLeft, GripVertical } from "lucide-react";
import { createPurchaseReturn, updatePurchaseReturn } from "../actions";
import { PurchaseReturnInput, PurchaseReturnWithDetails } from "../types";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/hooks/use-toast";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { generateId } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { PurchaseOrderWithDetails } from "../../orders/types";
import { PurchaseInvoiceWithDetails } from "../../invoices/types";

interface PurchaseReturnFormProps {
  returnItem?: SuperJSONResult;
  vendors: { id: string; name: string }[];
  purchaseOrders: SuperJSONResult;
  purchaseInvoices: SuperJSONResult;
  readonly?: boolean;
}

export function PurchaseReturnForm({
  returnItem: serializedReturnItem,
  vendors,
  purchaseOrders: serializedPurchaseOrders,
  purchaseInvoices: serializedPurchaseInvoices,
  readonly = false,
}: PurchaseReturnFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const returnItem = serializedReturnItem
    ? SuperJSON.deserialize<PurchaseReturnWithDetails>(serializedReturnItem)
    : undefined;

  const purchaseOrders = SuperJSON.deserialize<PurchaseOrderWithDetails[]>(
    serializedPurchaseOrders,
  );
  const purchaseInvoices = SuperJSON.deserialize<PurchaseInvoiceWithDetails[]>(
    serializedPurchaseInvoices,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [formData, setFormData] = useState<
    Omit<PurchaseReturnInput, "items"> & {
      items: (PurchaseReturnInput["items"][0] & { id: string })[];
    }
  >({
    returnNumber: returnItem?.returnNumber || "",
    contactId: returnItem?.contactId || "",
    purchaseOrderId: returnItem?.purchaseOrderId || undefined,
    purchaseInvoiceId: returnItem?.purchaseInvoiceId || undefined,
    returnDate: returnItem?.returnDate
      ? new Date(returnItem.returnDate)
      : new Date(),
    notes: returnItem?.notes || "",
    status: returnItem?.status || "DRAFT",
    items:
      returnItem?.items.map((item) => ({
        id: generateId(),
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })) || [],
  });

  const [filteredPurchaseOrders, setFilteredPurchaseOrders] =
    useState(purchaseOrders);
  const [filteredPurchaseInvoices, setFilteredPurchaseInvoices] =
    useState(purchaseInvoices);

  useEffect(() => {
    if (formData.contactId) {
      setFilteredPurchaseOrders(
        purchaseOrders.filter((po) => po.contactId === formData.contactId),
      );
      setFilteredPurchaseInvoices(
        purchaseInvoices.filter((pi) => pi.contactId === formData.contactId),
      );
    } else {
      setFilteredPurchaseOrders([]);
      setFilteredPurchaseInvoices([]);
    }
  }, [formData.contactId, purchaseOrders, purchaseInvoices]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.items.findIndex((item) => item.id === over.id);
        return {
          ...prev,
          items: arrayMove(prev.items, oldIndex, newIndex),
        };
      });
    }
  };

  const handleContactChange = (contactId: string) => {
    setFormData((prev) => ({
      ...prev,
      contactId,
      purchaseOrderId: undefined,
      purchaseInvoiceId: undefined,
      items: [], // Clear items on vendor change? Maybe safest.
    }));
  };

  const handlePurchaseOrderChange = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    setFormData((prev) => ({
      ...prev,
      purchaseOrderId: poId,
      items: po
        ? po.items.map((item) => ({
            id: generateId(),
            productId: item.productId,
            quantity: 0, // Default to 0 or 1? Maybe 0 to force user input.
            unitPrice: Number(item.unitCost),
          }))
        : [],
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseReturnInput["items"][0],
    value: number,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleAddItem = () => {
    // This requires selecting a product.
  };

  const calculateTotal = () => {
    return formData.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submissionData = {
      ...formData,
      items: formData.items.map(({ id, ...rest }) => rest),
    };

    try {
      if (returnItem) {
        const result = await updatePurchaseReturn(
          returnItem.id,
          submissionData,
        );
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Success",
          description: "Purchase return updated successfully",
        });
      } else {
        const result = await createPurchaseReturn(submissionData);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Success",
          description: "Purchase return created successfully",
        });
      }
      router.push("/purchase/returns");
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: string) => {
    // Need to find product name from somewhere.
    // If PO is selected, I can find it in PO items.
    const po = purchaseOrders.find((p) => p.id === formData.purchaseOrderId);
    if (po) {
      const item = po.items.find((i) => i.productId === productId);
      if (item) return item.product.name;
    }
    // Fallback if returnItem has it
    if (returnItem) {
      const item = returnItem.items.find((i) => i.productId === productId);
      if (item) return item.product.name;
    }
    return "Unknown Product";
  };

  const getProductUnit = (productId: string) => {
    const po = purchaseOrders.find((p) => p.id === formData.purchaseOrderId);
    if (po) {
      const item = po.items.find((i) => i.productId === productId);
      if (item)
        return (
          item.product.purchaseUnit?.symbol || item.product.baseUnit?.symbol
        );
    }
    if (returnItem) {
      const item = returnItem.items.find((i) => i.productId === productId);
      if (item)
        return (
          item.product.purchaseUnit?.symbol || item.product.baseUnit?.symbol
        );
    }
    return "-";
  };

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          New Purchase Return
        </h2>
        <div className="flex">
          {!readonly && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : returnItem ? "Update" : "Create"}
              </Button>
            </div>
          )}
          {readonly && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8 w-full">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Return Number</Label>
            <CustomInput
              value={formData.returnNumber}
              onChange={(e) =>
                setFormData({ ...formData, returnNumber: e.target.value })
              }
              placeholder="RTN-00001"
              disabled={readonly}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Vendor</Label>
            <CustomSelect
              value={formData.contactId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(val: any) => handleContactChange(val)}
              options={vendors.map((v) => ({ label: v.name, value: v.id }))}
              disabled={readonly}
              placeholder="Select vendor..."
            />
          </div>

          <div className="space-y-2">
            <Label>Purchase Order (Optional)</Label>
            <CustomSelect
              value={formData.purchaseOrderId || ""}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(val: any) => handlePurchaseOrderChange(val)}
              options={filteredPurchaseOrders.map((po) => ({
                label: po.orderNumber,
                value: po.id,
              }))}
              disabled={readonly || !formData.contactId}
              placeholder="Select PO..."
            />
          </div>

          <div className="space-y-2">
            <Label>Purchase Invoice (Optional)</Label>
            <CustomSelect
              value={formData.purchaseInvoiceId || ""}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(val: any) =>
                setFormData((prev) => ({ ...prev, purchaseInvoiceId: val }))
              }
              options={filteredPurchaseInvoices.map((pi) => ({
                label: pi.invoiceNumber,
                value: pi.id,
              }))}
              disabled={readonly || !formData.contactId}
              placeholder="Select Invoice..."
            />
          </div>

          <div className="space-y-2">
            <Label>Return Date</Label>
            <CustomInput
              type="date"
              value={formData.returnDate.toISOString().split("T")[0]}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  returnDate: new Date(e.target.value),
                })
              }
              disabled={readonly}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <CustomSelect
              value={formData.status || "DRAFT"}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(val: any) =>
                setFormData((prev) => ({ ...prev, status: val }))
              }
              options={[
                { label: "Draft", value: "DRAFT" },
                { label: "Approved", value: "APPROVED" },
                { label: "Completed", value: "COMPLETED" },
                { label: "Cancelled", value: "CANCELLED" },
              ]}
              disabled={
                readonly ||
                returnItem?.status === "COMPLETED" ||
                returnItem?.status === "CANCELLED"
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <CustomTextarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes..."
              disabled={readonly}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Return Items</h3>
          </div>

          <div className="rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[150px]">Quantity</TableHead>
                    <TableHead className="w-[80px]">Unit</TableHead>
                    <TableHead className="w-[150px]">Unit Price</TableHead>
                    <TableHead className="w-[150px] text-right">
                      Total
                    </TableHead>
                    {!readonly && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={formData.items.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {formData.items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center h-24 text-muted-foreground"
                        >
                          No items selected. Select a Purchase Order to populate
                          items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((item, index) => (
                        <SortableTableRow key={item.id} id={item.id}>
                          <TableCell>
                            {getProductName(item.productId)}
                          </TableCell>
                          <TableCell>
                            <CustomInput
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                              disabled={readonly}
                            />
                          </TableCell>
                          <TableCell>
                            <CustomInput
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "unitPrice",
                                  Number(e.target.value),
                                )
                              }
                              disabled={readonly}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {(item.quantity * item.unitPrice).toLocaleString()}
                          </TableCell>
                          {!readonly && (
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </SortableTableRow>
                      ))
                    )}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>

          <div className="flex justify-end">
            <div className="text-right">
              <span className="font-medium mr-4">Total Amount:</span>
              <span className="text-xl font-bold">
                {calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
