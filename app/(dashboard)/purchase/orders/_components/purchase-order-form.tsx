"use client";

import { useState } from "react";
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
} from "@dnd-kit/sortable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCheckIcon,
  SaveIcon,
  CheckCircle,
  Trash2Icon,
  ArrowLeftSquare,
  InfoIcon,
} from "lucide-react";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  issuePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  getPurchaseOrder,
} from "../actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PurchaseOrderInput } from "../types";
import { format } from "date-fns";
import { cn, formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { getProducts } from "@/app/(dashboard)/inventory/products/actions";

interface PurchaseOrderFormProps {
  order?: Awaited<ReturnType<typeof getPurchaseOrder>>;
  vendors: Awaited<ReturnType<typeof getContacts>>["data"];
  products: Awaited<ReturnType<typeof getProducts>>["products"];
  readonly?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

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
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Determine if form should be read-only based on status
  const isDraft = order?.status === "DRAFT" || !order;
  const isReadOnly = readonly || !isDraft;

  const [formData, setFormData] = useState<
    Omit<PurchaseOrderInput, "items"> & {
      items: (PurchaseOrderInput["items"][0] & { id: string })[];
    }
  >({
    contactId: order?.contactId || "",
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
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: generateId(), productId: "", quantity: 1, unitCost: 0 },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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
    if (isReadOnly) return;

    if (!formData.contactId) {
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
        if (!isEditing) {
          router.push("/purchase/orders");
        } else {
          // Stay on page but show success? Or redirect?
          // Revalidation happens in action, so UI updates.
        }
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

  const handleIssue = () => {
    if (!order) return;
    setIssueDialogOpen(true);
  };

  const confirmIssue = async () => {
    if (!order) return;
    setIsLoading(true);
    try {
      const result = await issuePurchaseOrder(order.id);
      if (!result.success) alert(result.error);
    } finally {
      setIsLoading(false);
      setIssueDialogOpen(false);
    }
  };

  const handleCancel = () => {
    if (!order) return;
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!order) return;
    setIsLoading(true);
    try {
      const result = await cancelPurchaseOrder(order.id);
      if (!result.success) alert(result.error);
    } finally {
      setIsLoading(false);
      setCancelDialogOpen(false);
    }
  };

  const handleClose = () => {
    if (!order) return;
    setCloseDialogOpen(true);
  };

  const confirmClose = async () => {
    if (!order) return;
    setIsLoading(true);
    try {
      const result = await closePurchaseOrder(order.id);
      if (!result.success) alert(result.error);
    } finally {
      setIsLoading(false);
      setCloseDialogOpen(false);
    }
  };

  const displayOrderNumber = order?.orderNumber?.startsWith("DRAFT")
    ? "Draft"
    : order?.orderNumber;

  return (
    <div className="flex-1 space-y-4 px-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex gap-5">
          <h2 className="text-xl font-bold tracking-tight flex-1">
            {displayOrderNumber === "Draft"
              ? "Draft Purchase Order"
              : `Purchase Order ${displayOrderNumber || "New"}`}
          </h2>
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
            {order && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <InfoIcon className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="min-w-1/3">
                  <DialogHeader>
                    <DialogTitle>Status History</DialogTitle>
                  </DialogHeader>
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-medium">Event</TableHead>
                        <TableHead className="text-right">Timestamp</TableHead>
                        <TableHead className="text-right">User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Created</TableCell>
                        <TableCell className="text-right">
                          {order.createdAt && formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.createdBy?.name || "System"}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>Last Updated</TableCell>
                        <TableCell className="text-right">
                          {order.updatedAt && formatDate(order.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.updatedBy?.name || "System"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Issued</TableCell>
                        <TableCell className="text-right">
                          {order.issuedAt && formatDate(order.issuedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.issuedBy?.name || "System"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Closed</TableCell>
                        <TableCell className="text-right">
                          {order.closedAt && formatDate(order.closedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.closedBy?.name || "System"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Cancelled</TableCell>
                        <TableCell className="text-right">
                          {order.cancelledAt && formatDate(order.cancelledAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.cancelledBy?.name || "System"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          {/* Action Buttons */}
          {isDraft && !readonly && (
            <>
              <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && <SaveIcon />}
                {isEditing ? "Save" : "Create"}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  onClick={handleIssue}
                  disabled={isLoading}
                >
                  <CheckCheckIcon />
                  Issue
                </Button>
              )}
            </>
          )}

          {formData.status === "ISSUED" && !readonly && (
            <>
              <Button type="button" onClick={handleClose} disabled={isLoading}>
                <CheckCircle />
                Finish
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <Trash2Icon />
                Discard
              </Button>
            </>
          )}

          {formData.status === "PARTIALLY_RECEIVED" && !readonly && (
            <Button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
            >
              <CheckCircle />
              Finish
            </Button>
          )}

          {/* Allow cancelling Drafts too */}
          {isDraft && isEditing && !readonly && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <Trash2Icon />
              Discard
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeftSquare />
            Back
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="space-y-4">
            <Card>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <CustomSelect
                      value={formData.contactId}
                      label="Vendor"
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, contactId: val }))
                      }
                      placeholder="Select Vendor"
                      disabled={isReadOnly}
                    >
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </CustomSelect>
                    <div className="grid grid-cols-2 gap-2">
                      <CustomInput
                        type="date"
                        label="Order Date"
                        id="order_date"
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
                        disabled={isReadOnly}
                      />
                      <CustomInput
                        type="date"
                        label="Expected Date"
                        id="expected_date"
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
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  <CustomTextarea
                    value={formData.notes || ""}
                    label="Notes"
                    className="resize-none"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    disabled={isReadOnly}
                  />
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
                                disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
                                disabled={isReadOnly}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                                {formatCurrency(item.quantity * item.unitCost)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {!isReadOnly && (
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={handleAddItem}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <div className="flex items-center gap-2 text-md">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        title="Issue Purchase Order"
        description="Are you sure you want to issue this PO? This will make it immutable and ready to be sent to the vendor."
        onConfirm={confirmIssue}
        isLoading={isLoading}
        confirmText="Issue Order"
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Purchase Order"
        description="Are you sure you want to cancel this PO? This action cannot be undone."
        onConfirm={confirmCancel}
        isLoading={isLoading}
        variant="destructive"
        confirmText="Cancel Order"
      />

      <ConfirmDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        title="Close Purchase Order"
        description="Are you sure you want to close this PO? This indicates that all items have been received or the order is finalized."
        onConfirm={confirmClose}
        isLoading={isLoading}
        confirmText="Close Order"
      />
    </div>
  );
}
