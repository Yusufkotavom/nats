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
} from "@dnd-kit/sortable";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createPurchaseReceive,
  updatePurchaseReceive,
  getPurchaseOrder,
  getPurchaseReceive,
  getProducts,
  getPurchaseOrdersForSelect,
} from "../actions";
import { PurchaseReceiveInput } from "../types";
import { format } from "date-fns";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { getContacts } from "@/app/(dashboard)/general/contacts/actions";
import { generateId } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { PurchaseReceiveWithDetails } from "../types";
import { PurchaseOrderWithDetails } from "../../orders/types";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { Paperclip } from "lucide-react";
import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ProductForSelect {
  id: string;
  name: string;
  sku: string;
  baseUnit: { symbol: string } | null;
  purchaseUnit: { symbol: string } | null;
}

interface PurchaseOrderForSelect {
  id: string;
  orderNumber: string;
  contactId: string;
  contact: { name: string };
  items: {
    id: string;
    productId: string;
    quantity: number;
    receivedQuantity: number;
  }[];
}

interface PurchaseReceiveFormProps {
  receive?: SuperJSONResult | null;
  vendors: Awaited<ReturnType<typeof getContacts>>["data"];
  departments: Department[];
  projects: Project[];
  products: SuperJSONResult;
  purchaseOrders: SuperJSONResult;
  readonly?: boolean;
}

export function PurchaseReceiveForm({
  receive: serializedReceive,
  vendors,
  departments,
  projects,
  products: serializedProducts,
  purchaseOrders: serializedPurchaseOrders,
  readonly = false,
}: PurchaseReceiveFormProps) {
  const receive = serializedReceive
    ? SuperJSON.deserialize<PurchaseReceiveWithDetails>(serializedReceive)
    : undefined;
  const products =
    SuperJSON.deserialize<ProductForSelect[]>(serializedProducts);
  const purchaseOrders = SuperJSON.deserialize<PurchaseOrderForSelect[]>(
    serializedPurchaseOrders,
  );

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!receive;

  const [attachments, setAttachments] = useState<Attachment[]>(
    receive?.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })) || []
  );
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);

  const [formData, setFormData] = useState<
    Omit<PurchaseReceiveInput, "items"> & {
      items: (PurchaseReceiveInput["items"][0] & { id: string })[];
    }
  >({
    contactId: receive?.contactId || "",
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
    }),
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
    receive?.status || "DRAFT",
  );

  // When Purchase Order is selected, populate items
  const handlePurchaseOrderChange = async (poId: string) => {
    setFormData((prev) => ({ ...prev, purchaseOrderId: poId }));

    if (poId) {
      try {
        const serializedPo = await getPurchaseOrder(poId);
        if (serializedPo) {
          const po =
            SuperJSON.deserialize<PurchaseOrderWithDetails>(serializedPo);
          // Auto-select vendor
          setFormData((prev) => ({ ...prev, contactId: po.contactId }));

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
    value: string | number | undefined,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      let result;
      const dataToSubmit = {
        ...formData,
        status,
        items: formData.items.map(({ id, ...item }) => item),
        attachmentIds: attachments.map((a) => a.id),
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
  const filteredPurchaseOrders = formData.contactId
    ? purchaseOrders.filter((po) => po.contactId === formData.contactId)
    : purchaseOrders;

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-lg font-bold tracking-tight">
          {receive?.receiveNumber ?? "New Purchase Receive"}
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
                    value={formData.contactId}
                    onValueChange={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        contactId: val,
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
                        {po.orderNumber} ({po.contact.name})
                      </SelectItem>
                    ))}
                  </CustomSelect>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <SearchableSelect
                      value={formData.departmentId || ""}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, departmentId: val || null }))
                      }
                      options={departments.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                      placeholder="Select Department"
                      disabled={readonly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <SearchableSelect
                      value={formData.projectId || ""}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, projectId: val || null }))
                      }
                      options={projects.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                      placeholder="Select Project"
                      disabled={readonly}
                    />
                  </div>
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
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAttachmentDialogOpen(true)}
                      className="w-fit"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Attachments ({attachments.length})
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1 text-sm"
                        >
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {file.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
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
                                {products?.map((p) => (
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
                                    parseInt(e.target.value) || 0,
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

      <AttachmentDialog
        open={isAttachmentDialogOpen}
        onOpenChange={setIsAttachmentDialogOpen}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        uploadAction={async (formData) => {
          const res = await uploadFile(formData);
          return res;
        }}
        readonly={readonly}
      />
    </div>
  );
}
