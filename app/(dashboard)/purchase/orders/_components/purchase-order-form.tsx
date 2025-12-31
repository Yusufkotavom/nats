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
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { createPurchaseOrder, updatePurchaseOrder } from "../actions";
import { PurchaseOrderWithDetails, PurchaseOrderInput } from "../types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { PurchaseOrderStatus } from "@/prisma/generated/prisma/enums";

interface PurchaseOrderFormProps {
  order?: PurchaseOrderWithDetails;
  vendors: { id: string; name: string }[];
  products: {
    id: string;
    name: string;
    sku: string;
    cost: number;
    baseUnit?: { symbol: string } | null;
    purchaseUnit?: { symbol: string } | null;
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

export function PurchaseOrderForm({
  order,
  vendors,
  products,
  readonly = false,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!order;

  const [formData, setFormData] = useState<
    Omit<PurchaseOrderInput, "items"> & {
      items: (PurchaseOrderInput["items"][0] & { id: string })[];
    }
  >({
    vendorId: order?.vendorId || "",
    orderDate: order?.orderDate ? new Date(order.orderDate) : new Date(),
    expectedDate: order?.expectedDate ? new Date(order.expectedDate) : null,
    notes: order?.notes || "",
    status: order?.status || "DRAFT",
    items:
      order?.items.map((item) => ({
        id: generateId(),
        productId: item.productId,
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
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

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: generateId(), productId: "", quantity: 1, unitCost: 0 },
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
    value: string | number
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill cost if product changes
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unitCost = Number(product.cost);
      }
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

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
      const submissionData = {
        ...formData,
        items: formData.items.map(({ id, ...item }) => item),
      };
      let result;
      if (isEditing && order) {
        result = await updatePurchaseOrder(order.id, submissionData);
      } else {
        result = await createPurchaseOrder(submissionData);
      }

      if (result.success) {
        router.push("/purchase/orders");
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

  return (
    <div className="flex-1 space-y-4 px-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight flex-1">
          Create Purchase Order
        </h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                formData.status === "DRAFT"
                  ? "bg-gray-500"
                  : formData.status === "ISSUED"
                  ? "bg-blue-500"
                  : formData.status === "PARTIALLY_RECEIVED"
                  ? "bg-yellow-500"
                  : formData.status === "CLOSED"
                  ? "bg-green-500"
                  : "bg-red-500"
              )}
            />
            <span className="font-medium">
              {formData.status?.replace("_", " ")}
            </span>
          </div>
          {!readonly && (
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Order" : "Create Order"}
            </Button>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="space-y-4">
            <Card>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="space-y-2">
                      <Label>Vendor</Label>
                      <CustomSelect
                        value={formData.vendorId}
                        onValueChange={(val) =>
                          setFormData((prev) => ({ ...prev, vendorId: val }))
                        }
                        placeholder="Select Vendor"
                        disabled={readonly}
                      >
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </CustomSelect>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Order Date</Label>
                        <CustomInput
                          type="date"
                          value={
                            formData.orderDate
                              ? format(formData.orderDate, "yyyy-MM-dd")
                              : ""
                          }
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              orderDate: e.target.value
                                ? new Date(e.target.value)
                                : new Date(),
                            }))
                          }
                          disabled={readonly}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Date</Label>
                        <CustomInput
                          type="date"
                          value={
                            formData.expectedDate
                              ? format(formData.expectedDate, "yyyy-MM-dd")
                              : ""
                          }
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              expectedDate: e.target.value
                                ? new Date(e.target.value)
                                : null,
                            }))
                          }
                          disabled={readonly}
                        />
                      </div>
                    </div>
                    {isEditing && !readonly && (
                      <div className="mt-4">
                        <Label>Update Status</Label>
                        <CustomSelect
                          value={formData.status || "DRAFT"}
                          onValueChange={(val) =>
                            setFormData((prev) => ({
                              ...prev,
                              status: val as PurchaseOrderStatus,
                            }))
                          }
                        >
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="ISSUED">Issued</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </CustomSelect>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Label>Notes</Label>
                    <CustomTextarea
                      value={formData.notes || ""}
                      className="resize-none"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      disabled={readonly}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ordered Items</CardTitle>
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
                        <TableHead className="w-[120px]">Order Qty</TableHead>
                        <TableHead className="w-[80px]">Unit</TableHead>
                        <TableHead className="w-[150px]">Price</TableHead>
                        <TableHead className="w-[150px]">Total</TableHead>
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
                                placeholder="Select Product"
                                disabled={readonly}
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
                                    Number(e.target.value)
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center text-sm text-muted-foreground">
                                {products.find((p) => p.id === item.productId)
                                  ?.purchaseUnit?.symbol ||
                                  products.find((p) => p.id === item.productId)
                                    ?.baseUnit?.symbol ||
                                  "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <CurrencyInput
                                value={item.unitCost}
                                onChange={(val) =>
                                  handleItemChange(
                                    index,
                                    "unitCost",
                                    Number(val)
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                                {formatCurrency(item.quantity * item.unitCost)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {!readonly && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
              <CardFooter className="justify-between border-t p-4">
                {!readonly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                )}
                <div className="flex items-center gap-2 text-md">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
