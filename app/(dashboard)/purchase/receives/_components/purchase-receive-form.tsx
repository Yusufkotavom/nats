"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createPurchaseReceive,
  updatePurchaseReceive,
  getPurchaseOrder,
} from "../actions";
import { PurchaseReceiveWithDetails, PurchaseReceiveInput } from "../types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PurchaseReceiveFormProps {
  receive?: PurchaseReceiveWithDetails;
  vendors: { id: string; name: string }[];
  products: {
    id: string;
    name: string;
    sku: string;
    purchaseUnit?: { symbol: string } | null;
  }[];
  purchaseOrders: {
    id: string;
    orderNumber: string;
    vendorId: string;
    vendor: { name: string };
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

export function PurchaseReceiveForm({
  receive,
  vendors,
  products,
  purchaseOrders,
  readonly = false,
}: PurchaseReceiveFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!receive;

  const [formData, setFormData] = useState<
    Omit<PurchaseReceiveInput, "items"> & {
      items: (PurchaseReceiveInput["items"][0] & { id: string })[];
    }
  >({
    vendorId: receive?.vendorId || "",
    purchaseOrderId: receive?.purchaseOrderId || undefined,
    receiveDate: receive?.receiveDate
      ? new Date(receive.receiveDate)
      : new Date(),
    notes: receive?.notes || "",
    items:
      receive?.items.map((item) => ({
        id: generateId(),
        productId: item.productId,
        quantity: item.quantity,
        purchaseOrderItemId: item.purchaseOrderItemId || undefined,
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

  const [status, setStatus] = useState<"DRAFT" | "COMPLETED" | "CANCELLED">(
    receive?.status || "DRAFT"
  );

  // When Purchase Order is selected, populate items
  const handlePurchaseOrderChange = async (poId: string) => {
    setFormData((prev) => ({ ...prev, purchaseOrderId: poId }));

    if (poId) {
      try {
        const po = await getPurchaseOrder(poId);
        if (po) {
          // Auto-select vendor
          setFormData((prev) => ({ ...prev, vendorId: po.vendorId }));

          // Populate items with remaining quantity
          const newItems = po.items
            .filter((item) => item.quantity > item.receivedQuantity)
            .map((item) => ({
              id: generateId(),
              productId: item.productId,
              quantity: item.quantity - item.receivedQuantity,
              purchaseOrderItemId: item.id,
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
      items: [...prev.items, { id: generateId(), productId: "", quantity: 1 }],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorId) {
      alert("Please select a vendor");
      return;
    }
    if (formData.items.length === 0) {
      alert("Please add at least one item");
      return;
    }
    for (const item of formData.items) {
      if (!item.productId) {
        alert("Please select a product for all items");
        return;
      }
      if (item.quantity <= 0) {
        alert("Quantity must be greater than 0");
        return;
      }
    }

    setIsLoading(true);
    try {
      let result;
      const dataToSubmit = {
        ...formData,
        status,
        items: formData.items.map(({ id, ...item }) => item),
      };

      if (isEditing && receive) {
        result = await updatePurchaseReceive(receive.id, dataToSubmit);
      } else {
        result = await createPurchaseReceive(dataToSubmit);
      }

      if (result.success) {
        router.push("/purchase/receives");
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
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-lg font-bold tracking-tight">
          New Purchase Receive
        </h2>
        <div className="flex gap-2">
          {!readonly && (
            <>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
              {isEditing && status !== "COMPLETED" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setStatus("COMPLETED")}
                >
                  Mark as Completed
                </Button>
              )}
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
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receive Details</CardTitle>
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
                    disabled={readonly || !!formData.purchaseOrderId} // Disable if PO selected (unless we want to allow changing vendor which clears PO)
                  >
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </CustomSelect>
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
                  <Label>Receive Date</Label>
                  <CustomInput
                    type="date"
                    value={
                      formData.receiveDate
                        ? format(formData.receiveDate, "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        receiveDate: e.target.value
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
                      value={status}
                      onValueChange={(val) =>
                        setStatus(val as "DRAFT" | "COMPLETED" | "CANCELLED")
                      }
                      disabled={readonly || receive.status === "COMPLETED"}
                    >
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </CustomSelect>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <CustomTextarea
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Received Items</CardTitle>
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
                        <TableHead>Product</TableHead>
                        <TableHead className="w-[150px]">Quantity</TableHead>
                        <TableHead className="w-[80px]">Unit</TableHead>
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
                              <CustomSelect
                                value={item.productId}
                                onValueChange={(val) =>
                                  handleItemChange(index, "productId", val)
                                }
                                disabled={
                                  readonly || !!item.purchaseOrderItemId
                                }
                              >
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
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
              </CardContent>
              <CardFooter>
                {!readonly && (
                  <Button type="button" size="sm" onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
