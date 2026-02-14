"use client";

import { useState, useMemo } from "react";
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
} from "@dnd-kit/sortable";
import { Trash2, ArrowLeft, Paperclip } from "lucide-react";
import { createSalesReturn, updateSalesReturn } from "../actions";
import { SalesReturnInput, SalesReturnWithDetails } from "../types";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/hooks/use-toast";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { generateId } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { SalesOrderWithDetails } from "../../orders/types";
import { SalesInvoiceWithDetails } from "../../invoices/types";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface SalesReturnFormProps {
    returnItem?: SuperJSONResult;
    customers: { id: string; name: string }[];
    salesOrders: SuperJSONResult;
    salesInvoices: SuperJSONResult;
    departments?: Department[];
    projects?: Project[];
    readonly?: boolean;
}

export function SalesReturnForm({
    returnItem: serializedReturnItem,
    customers,
    salesOrders: serializedSalesOrders,
    salesInvoices: serializedSalesInvoices,
    departments = [],
    projects = [],
    readonly = false,
}: SalesReturnFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const returnItem = serializedReturnItem
        ? SuperJSON.deserialize<SalesReturnWithDetails>(serializedReturnItem)
        : undefined;

    const [attachments, setAttachments] = useState<Attachment[]>(
        returnItem?.attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            url: a.url,
        })) || [],
    );
    const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);

    const salesOrders = useMemo(
        () =>
            SuperJSON.deserialize<SalesOrderWithDetails[]>(
                serializedSalesOrders,
            ),
        [serializedSalesOrders],
    );
    const salesInvoices = useMemo(
        () =>
            SuperJSON.deserialize<SalesInvoiceWithDetails[]>(
                serializedSalesInvoices,
            ),
        [serializedSalesInvoices],
    );

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const [formData, setFormData] = useState<
        Omit<SalesReturnInput, "items"> & {
            items: (SalesReturnInput["items"][0] & { id: string })[];
        }
    >({
        returnNumber: returnItem?.returnNumber || "",
        contactId: returnItem?.contactId || "",
        salesOrderId: returnItem?.salesOrderId || undefined,
        salesInvoiceId: returnItem?.salesInvoiceId || undefined,
        departmentId: returnItem?.departmentId || null,
        projectId: returnItem?.projectId || null,
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

    const filteredSalesOrders = useMemo(() => {
        if (formData.contactId) {
            return salesOrders.filter((so) => so.contactId === formData.contactId);
        }
        return [];
    }, [formData.contactId, salesOrders]);

    const filteredSalesInvoices = useMemo(() => {
        if (formData.contactId) {
            return salesInvoices.filter(
                (si) => si.contactId === formData.contactId,
            );
        }
        return [];
    }, [formData.contactId, salesInvoices]);

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
            salesOrderId: undefined,
            salesInvoiceId: undefined,
            items: [], // Clear items on customer change
        }));
    };

    const handleSalesOrderChange = (soId: string) => {
        const so = salesOrders.find((s) => s.id === soId);
        setFormData((prev) => ({
            ...prev,
            salesOrderId: soId,
            departmentId: so?.departmentId || prev.departmentId,
            projectId: so?.projectId || prev.projectId,
            items: so
                ? so.items.map((item) => ({
                    id: generateId(),
                    productId: item.productId,
                    quantity: 0,
                    unitPrice: Number(item.unitPrice),
                }))
                : [],
        }));
    };

    const handleItemChange = (
        index: number,
        field: keyof SalesReturnInput["items"][0],
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
            attachmentIds: attachments.map((a) => a.id),
        };

        try {
            if (returnItem) {
                const result = await updateSalesReturn(
                    returnItem.id,
                    submissionData,
                );
                if (!result.success) throw new Error(result.error);
                toast({
                    title: "Success",
                    description: "Sales return updated successfully",
                });
            } else {
                const result = await createSalesReturn(submissionData);
                if (!result.success) throw new Error(result.error);
                toast({
                    title: "Success",
                    description: "Sales return created successfully",
                });
            }
            router.push("/sales/returns");
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
        const so = salesOrders.find((s) => s.id === formData.salesOrderId);
        if (so) {
            const item = so.items.find((i) => i.productId === productId);
            if (item) return item.product.name;
        }
        if (returnItem) {
            const item = returnItem.items.find((i) => i.productId === productId);
            if (item) return item.product.name;
        }
        return "Unknown Product";
    };

    const getProductUnit = (productId: string) => {
        const so = salesOrders.find((s) => s.id === formData.salesOrderId);
        if (so) {
            const item = so.items.find((i) => i.productId === productId);
            if (item)
                return (
                    item.product.salesUnit?.symbol || item.product.baseUnit?.symbol
                );
        }
        if (returnItem) {
            const item = returnItem.items.find((i) => i.productId === productId);
            if (item)
                return (
                    item.product.salesUnit?.symbol || item.product.baseUnit?.symbol
                );
        }
        return "-";
    };

    return (
        <div className="flex-1 space-y-4 px-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-xl font-bold tracking-tight">
                    {returnItem ? "Edit Sales Return" : "New Sales Return"}
                </h2>
                <div className="flex">
                    {!readonly && (
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAttachmentDialogOpen(true)}
                            >
                                <Paperclip className="mr-2 h-4 w-4" />
                                Attachments ({attachments.length})
                            </Button>
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
                            placeholder="Leave blank to auto-generate"
                            disabled={readonly}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <CustomSelect
                            defaultValue={formData.contactId}
                            onValueChange={(val: any) => handleContactChange(val)}
                            options={customers.map((c) => ({ label: c.name, value: c.id }))}
                            disabled={readonly}
                            placeholder="Select customer..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Sales Order (Optional)</Label>
                        <CustomSelect
                            value={formData.salesOrderId || ""}
                            onValueChange={(val: any) => handleSalesOrderChange(val)}
                            options={filteredSalesOrders.map((so) => ({
                                label: so.orderNumber,
                                value: so.id,
                            }))}
                            disabled={readonly || !formData.contactId}
                            placeholder="Select SO..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Sales Invoice (Optional)</Label>
                        <CustomSelect
                            value={formData.salesInvoiceId || ""}
                            onValueChange={(val: any) =>
                                setFormData((prev) => ({ ...prev, salesInvoiceId: val }))
                            }
                            options={filteredSalesInvoices.map((si) => ({
                                label: si.invoiceNumber,
                                value: si.id,
                            }))}
                            disabled={readonly || !formData.contactId}
                            placeholder="Select Invoice..."
                        />
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
                                                    colSpan={7}
                                                    className="text-center h-24 text-muted-foreground"
                                                >
                                                    No items selected. Select a Sales Order to populate
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
                                                    <TableCell className="text-muted-foreground">
                                                        {getProductUnit(item.productId)}
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
