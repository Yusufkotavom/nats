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
import { CustomTextarea } from "@/components/ui/custom-textarea";
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
  PrinterIcon,
} from "lucide-react";
import {
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
  closeSalesOrder,
  createSalesOrderQuickContact,
  updateLinkedServiceStatus,
} from "../actions";
import { createSalesInvoice } from "../../invoices/actions";
import { createSalesPayment, getCashAccounts } from "../../payments/actions";
import { SalesOrderInput, SalesOrderWithDetails } from "../types";
import { format } from "date-fns";
import { cn, generateId } from "@/lib/utils";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";
import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { ProductWithDetails } from "@/app/[locale]/(dashboard)/inventory/types";
import { useFormatDate, useFormatCurrency } from "@/hooks";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/[locale]/(dashboard)/general/files/actions";
import { Paperclip } from "lucide-react";
import { ReportPreviewDialog } from "@/app/[locale]/(dashboard)/reporting/_components/report-preview-dialog";
import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TableOverflow } from "@/components/ui/table-overflow";
import { Badge } from "@/components/ui/badge";
import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import { useTranslations } from "next-intl";
import { normalizePhoneForWhatsApp } from "@/lib/communication/company-communication";
import { useToast } from "@/hooks/use-toast";

interface SalesOrderFormProps {
  order?: SuperJSONResult;
  serviceMeta?: SuperJSONResult;
  customers: Awaited<ReturnType<typeof getContacts>>["data"];
  products: Awaited<ReturnType<typeof getProducts>>["products"];
  departments?: Department[];
  projects?: Project[];
  readonly?: boolean;
}

export function SalesOrderForm({
  order: serializedOrder,
  serviceMeta,
  customers,
  products: serializedProducts,
  departments = [],
  projects = [],
  readonly = false,
}: SalesOrderFormProps) {
  const order = serializedOrder
    ? SuperJSON.deserialize<SalesOrderWithDetails>(serializedOrder)
    : undefined;
  const parsedServiceMeta = serviceMeta
    ? SuperJSON.deserialize<{
        isServiceOrder: boolean;
        serviceOrderId: string;
        serviceStatus: "NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED";
      }>(serviceMeta)
    : null;
  const products =
    serializedProducts && "json" in serializedProducts
      ? SuperJSON.deserialize<ProductWithDetails[]>(serializedProducts)
      : [];

  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const [isLoading, setIsLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED">(
    parsedServiceMeta?.serviceStatus || "NEW",
  );
  const [isServiceOrder, setIsServiceOrder] = useState<boolean>(parsedServiceMeta?.isServiceOrder || Boolean(order?.isServiceOrder));
  const isEditing = !!order;
  const confirm = useConfirm();
  const alert = useAlert();

  // Determine if form should be read-only based on status
  const isDraft = order?.status === "DRAFT" || !order;
  const isReadOnly = readonly || !isDraft;

  const [attachments, setAttachments] = useState<Attachment[]>(
    order?.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })) || []
  );
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState(
    customers.map((c) => ({
      value: c.id,
      label: c.name,
      subtitle: [c.phone, c.address].filter(Boolean).join(" • "),
    })),
  );
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    subtitle: p.category?.name || p.sku || "-",
    meta: formatCurrency(Number(p.price || 0)),
  }));
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [autoCreateInvoicePayment, setAutoCreateInvoicePayment] = useState(true);
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<Array<{ id: string; name: string; method: "CASH" | "BANK" }>>([]);


  const [formData, setFormData] = useState<
    Omit<SalesOrderInput, "items"> & {
      items: (SalesOrderInput["items"][0] & { id: string })[];
    }
  >({
    contactId: order?.contactId || "",
    departmentId: order?.departmentId || null,
    projectId: order?.projectId || null,
    orderDate: order?.orderDate ? new Date(order.orderDate) : new Date(),
    expectedDate: order?.expectedDate ? new Date(order.expectedDate) : null,
    notes: order?.notes || "",
    status: order?.status || "DRAFT",
    isServiceOrder: order?.isServiceOrder || parsedServiceMeta?.isServiceOrder || false,
    serviceWorkflowStatus:
      (order?.serviceWorkflowStatus as "NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED" | null) ||
      parsedServiceMeta?.serviceStatus ||
      null,
    items:
      order?.items.map((item) => ({
        id: generateId(),
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })) || [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
        { id: generateId(), productId: "", quantity: 1, unitPrice: 0 },
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
    value: string | number,
  ) => {
    if (isReadOnly) return;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill price if product changes
    if (field === "productId") {
      const product = products?.find((p: { id: string }) => p.id === value);
      if (product) {
        newItems[index].unitPrice = Number(product.price);
      }
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const raw = await getCashAccounts();
        const parsed = SuperJSON.deserialize<{ methods: Array<{ id: string; name: string; method: "CASH" | "BANK" }> }>(raw as unknown as SuperJSONResult);
        setPaymentMethodOptions(parsed.methods || []);
        if (!paymentMethodId && parsed.methods?.length) {
          setPaymentMethodId(parsed.methods[0].id);
        }
      } catch {
        setPaymentMethodOptions([]);
      }
    };
    void loadPaymentMethods();
  }, [paymentMethodId]);

  const handleQuickAddCustomer = async () => {
    if (!quickName.trim()) {
      await alert({ title: "Error", description: "Customer name is required" });
      return;
    }

    try {
      const raw = await createSalesOrderQuickContact({
        name: quickName.trim(),
        phone: quickPhone.trim() || undefined,
        email: quickEmail.trim() || undefined,
        address: quickAddress.trim() || undefined,
      });
      const contact = SuperJSON.deserialize<{ id: string; name: string; phone?: string | null; address?: string | null }>(raw as any);
      setCustomerOptions((prev) => [{
        value: contact.id,
        label: contact.name,
        subtitle: [contact.phone, contact.address].filter(Boolean).join(" • "),
      }, ...prev]);
      setFormData((prev) => ({ ...prev, contactId: contact.id }));
      setQuickName("");
      setQuickPhone("");
      setQuickEmail("");
      setQuickAddress("");
      setQuickOpen(false);
    } catch (error) {
      await alert({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!formData.contactId) {
      await alert({ title: "Error", description: "Please select a customer" });
      return;
    }
    if (formData.items.length === 0) {
      await alert({
        title: "Error",
        description: "Please add at least one item",
      });
      return;
    }
    for (const item of formData.items) {
      if (!item.productId) {
        await alert({
          title: "Error",
          description: "Please select a product for all items",
        });
        return;
      }
      if (item.quantity <= 0) {
        await alert({
          title: "Error",
          description: "Quantity must be greater than 0",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const submissionData = {
        ...formData,
        items: formData.items.map(({ id: _id, ...item }) => item),
        attachmentIds: attachments.map((a) => a.id),
      };
      let result;
      if (isEditing && order) {
        result = await updateSalesOrder(order.id, submissionData);
      } else {
        result = await createSalesOrder(submissionData);
      }

      if (result.success) {
        if (!isEditing) {
          const createdOrder = result.data
            ? SuperJSON.deserialize<{ id: string }>(result.data)
            : null;
          if (createdOrder?.id && autoCreateInvoicePayment && downPaymentAmount > 0) {
            const invoiceResult = await createSalesInvoice({
              invoiceNumber: "",
              contactId: formData.contactId,
              salesOrderId: createdOrder.id,
              invoiceDate: new Date(),
              dueDate: new Date(),
              notes: "Auto-created from Sales Order with DP",
              items: formData.items.map((item) => ({
                description: products.find((p) => p.id === item.productId)?.name || "Item",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: 0,
                tax: 0,
                productId: item.productId,
              })),
              globalDiscount: 0,
              totalTax: 0,
              shippingCost: 0,
              attachmentIds: [],
              departmentId: formData.departmentId || undefined,
              projectId: formData.projectId || undefined,
            });

            if (invoiceResult.success && invoiceResult.data) {
              const createdInvoice = SuperJSON.deserialize<{ id: string }>(invoiceResult.data as SuperJSONResult);
              const selectedMethod = paymentMethodOptions.find((m) => m.id === paymentMethodId);
              if (createdInvoice?.id && selectedMethod && paymentMethodId) {
                await createSalesPayment({
                  paymentNumber: "",
                  contactId: formData.contactId,
                  salesInvoiceId: createdInvoice.id,
                  paymentDate: new Date(),
                  amount: downPaymentAmount,
                  reference: createdOrder.id,
                  notes: "Auto DP Payment",
                  method: selectedMethod.method,
                  cashAccountId: paymentMethodId,
                  attachmentIds: [],
                  departmentId: formData.departmentId || null,
                  projectId: formData.projectId || null,
                });
              }
            }
          }
          if (createdOrder?.id) {
            router.push(`/sales/orders/${createdOrder.id}/edit`);
          } else {
            router.push("/sales/orders");
          }
        } else {
          // Stay on page but show success? Or redirect?
          // Revalidation happens in action, so UI updates.
        }
      } else {
        await alert({ title: "Error", description: result.error });
      }
    } catch (error) {
      console.error(error);
      await alert({ title: "Error", description: "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    if (
      await confirm({
        title: "Confirm Sales Order",
        description:
          "Are you sure you want to confirm this SO? This will make it immutable and ready to be processed.",
        confirmText: "Confirm Order",
      })
    ) {
      setIsLoading(true);
      try {
        const result = await confirmSalesOrder(order.id);
        if (!result.success) {
          await alert({ title: "Error", description: result.error });
          return;
        }

        const confirmed = result.data
          ? SuperJSON.deserialize<{ status?: string; orderNumber?: string }>(result.data)
          : null;
        setFormData((prev) => ({
          ...prev,
          status: (confirmed?.status as "DRAFT" | "CONFIRMED" | "PARTIALLY_SHIPPED" | "SHIPPED" | "CLOSED" | "CANCELLED") || "CONFIRMED",
        }));

        router.refresh();

        await alert({
          title: "Sales Order Confirmed",
          description: "Gunakan tombol Print dan Notify Customer di kanan atas untuk aksi lanjutan.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (
      await confirm({
        title: "Cancel Sales Order",
        description:
          "Are you sure you want to cancel this SO? This action cannot be undone.",
        confirmText: "Cancel Order",
        variant: "destructive",
      })
    ) {
      setIsLoading(true);
      try {
        const result = await cancelSalesOrder(order.id);
        if (!result.success)
          await alert({ title: "Error", description: result.error });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleServiceStatusChange = async (
    nextStatus: "NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED",
  ) => {
    if (!order?.id || !isServiceOrder) return;
    setServiceStatus(nextStatus);
    setFormData((prev) => ({ ...prev, serviceWorkflowStatus: nextStatus }));
    const result = await updateLinkedServiceStatus({ salesOrderId: order.id, status: nextStatus });
    if (!result.success) {
      toast({ variant: "destructive", title: "Error", description: result.error || "Gagal update status service" });
      return;
    }
    toast({ title: "Success", description: `Status service: ${nextStatus}` });
    router.refresh();
  };

  const handleNotifyCustomer = () => {
    if (!order) return;
    const phone = order.contact?.phone ? normalizePhoneForWhatsApp(order.contact.phone) : null;
    if (!phone) return;
    const message = `Halo ${order.contact?.name || "Customer"}, Sales Order ${order.orderNumber} saat ini berstatus ${formData.status}. Total: ${formatCurrency(totalAmount)}.`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleClose = async () => {
    if (!order) return;
    if (
      await confirm({
        title: "Close Sales Order",
        description:
          "Are you sure you want to close this SO? This indicates that all items have been shipped or the order is finalized.",
        confirmText: "Close Order",
      })
    ) {
      setIsLoading(true);
      try {
        const result = await closeSalesOrder(order.id);
        if (!result.success)
          await alert({ title: "Error", description: result.error });
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // For Sales Orders, budget checks might be different (Revenue Budget?).
    // But the user asked for "budget tracking system" which usually implies spending.
    // However, sales contribute to Revenue Budget.
    // If we want to check Revenue Target, we can use similar logic but reverse check (Warning if below target?).
    // The requirement "budget validation logic that checks transaction amounts against the assigned budget... provides real-time warnings when approaching or exceeding budget limits".
    // "Approaching or exceeding limits" usually means spending limits.
    // For Sales, it might be "Credit Limit"?
    // But since the request is about "Budgeting Module Integration", and usually budgets track expenses or revenue targets.
    // Let's assume for now we validate against budget just to link it.
    // BUT, checking "availability" (spending) doesn't make sense for Sales (Income).
    // So for Sales, we might just want to LINK it, but NOT warn about "exceeding budget" (unless we are exceeding a SALES QUOTA? which is good).
    // I will skip the warning logic for SalesOrder unless I inverse it.
    // But I will keep the linkage.
  }, []);

  const displayOrderNumber = order?.orderNumber?.startsWith("DRAFT")
    ? "Draft"
    : order?.orderNumber;
  const showDimensionFields = departments.length > 0 || projects.length > 0;
  const firstInvoice = order?.invoices?.[0];
  const firstShipment = order?.shipments?.[0];
  const firstPayment = firstInvoice?.payments?.[0];

  return (
    <PageFormLayout>
      <PageFormHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <PageFormTitle title={displayOrderNumber === "Draft"
            ? "Draft Sales Order"
            : `Sales Order ${displayOrderNumber || "New"}`} />
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                formData.status === "DRAFT"
                  ? "bg-gray-500"
                  : formData.status === "CONFIRMED"
                    ? "bg-blue-500"
                    : formData.status === "PARTIALLY_SHIPPED"
                      ? "bg-yellow-500"
                      : formData.status === "CLOSED"
                        ? "bg-green-500"
                        : "bg-red-500",
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
                <DialogContent className="w-[95vw] max-w-2xl">
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
                          {order.createdById || "System"}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>Last Updated</TableCell>
                        <TableCell className="text-right">
                          {order.updatedAt && formatDate(order.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.updatedById || "System"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Confirmed</TableCell>
                        <TableCell className="text-right">
                          {order.confirmedAt && formatDate(order.confirmedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.confirmedById || "System"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Closed</TableCell>
                        <TableCell className="text-right">
                          {order.closedAt && formatDate(order.closedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.closedById || "System"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Cancelled</TableCell>
                        <TableCell className="text-right">
                          {order.cancelledAt && formatDate(order.cancelledAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.cancelledById || "System"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <PageFormActions className="w-full justify-start md:w-auto md:justify-end">
          <div className="flex w-full flex-wrap gap-2 [&>button]:w-full sm:[&>button]:w-auto">
          {/* Action Buttons */}
          {isDraft && !readonly && (
            <>
              <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && <SaveIcon className="mr-2 h-4 w-4" />}
                {isEditing ? tCommon("save") : tCommon("create")}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                >
                  <CheckCheckIcon className="mr-2 h-4 w-4" />
                  {tCommon("confirm")}
                </Button>
              )}
            </>
          )}

          {formData.status === "CONFIRMED" && !readonly && (
            <>
              {order ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(firstShipment ? `/sales/shipments/${firstShipment.id}/edit` : `/sales/shipments/new?salesOrderId=${order.id}`)}
                    disabled={isLoading}
                  >
                    {firstShipment ? "Open Shipment" : "Create Shipment"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(firstInvoice ? `/sales/invoices/${firstInvoice.id}/edit` : `/sales/invoices/new?salesOrderId=${order.id}`)}
                    disabled={isLoading}
                  >
                    {firstInvoice ? "Open Invoice" : "Create Invoice"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(firstPayment ? `/sales/payments/${firstPayment.id}/edit` : firstInvoice ? `/sales/payments/new?salesInvoiceId=${firstInvoice.id}` : `/sales/invoices/new?salesOrderId=${order.id}`)}
                    disabled={isLoading}
                  >
                    {firstPayment ? "Open Payment" : "Create Payment"}
                  </Button>
                </>
              ) : null}
              <Button type="button" onClick={handleClose} disabled={isLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {tCommon("finish")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                {tCommon("discard")}
              </Button>
            </>
          )}

          {formData.status === "PARTIALLY_SHIPPED" && !readonly && (
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

          {order && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReportPreviewOpen(true)}
              >
                <PrinterIcon className="mr-2 h-4 w-4" />
                {tCommon("print")}
              </Button>
              <ReportPreviewDialog
                isOpen={isReportPreviewOpen}
                onOpenChange={setIsReportPreviewOpen}
                code="SALES_ORDER"
                input={{ orderId: order.id }}
                title={`Sales Order #${order.orderNumber}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNotifyCustomer}
                disabled={!order.contact?.phone}
              >
                Notify Customer
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                window.close();
              }
            }}
          >
            <ArrowLeftSquare className="mr-2 h-4 w-4" />
            {tCommon("close")}
          </Button>
          </div>
        </PageFormActions>
      </PageFormHeader>
      <form onSubmit={handleSubmit} className="w-full min-w-0 max-w-full overflow-x-hidden">
        <PageFormContent className="mt-4 grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden border-none bg-transparent p-0 shadow-none">
          <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
            <Card className="w-full min-w-0 max-w-full overflow-hidden">
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("customer")}</label>
                      <div className="flex gap-2">
                        <SearchableSelect
                          className="flex-1"
                          value={formData.contactId || ""}
                          onValueChange={(val) =>
                            setFormData((prev) => ({
                              ...prev,
                              contactId: val || "",
                            }))
                          }
                          options={customerOptions}
                          placeholder={t("placeholder_select_customer")}
                          disabled={isReadOnly}
                        />
                        {!isReadOnly && (
                          <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline">Quick Add</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Quick Add Customer</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <CustomInput value={quickName} onChange={(e) => setQuickName(e.target.value)} />
                                <label className="text-sm font-medium">Phone</label>
                                <CustomInput value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} />
                                <label className="text-sm font-medium">Email</label>
                                <CustomInput value={quickEmail} onChange={(e) => setQuickEmail(e.target.value)} />
                                <label className="text-sm font-medium">Address</label>
                                <CustomTextarea
                                  value={quickAddress}
                                  onChange={(e) => setQuickAddress(e.target.value)}
                                  className="min-h-[84px]"
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button type="button" variant="outline" onClick={() => setQuickOpen(false)}>Cancel</Button>
                                  <Button type="button" onClick={handleQuickAddCustomer}>Save</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <CustomInput
                        type="date"
                        label={t("order_date")}
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
                        label={t("expected_date")}
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

                    {showDimensionFields ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("department")}</label>
                          <SearchableSelect
                            value={formData.departmentId || ""}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, departmentId: val || null }))}
                            options={departments.map(d => ({ value: d.id, label: d.name }))}
                            placeholder={t("placeholder_select_department")}
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("project")}</label>
                          <SearchableSelect
                            value={formData.projectId || ""}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val || null }))}
                            options={projects.map(p => ({ value: p.id, label: p.name }))}
                            placeholder={t("placeholder_select_project")}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <CustomTextarea
                    value={formData.notes || ""}
                    label={t("notes")}
                    className="resize-none h-[85%]"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder={t("placeholder_notes")}
                    disabled={isReadOnly}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAttachmentDialogOpen(true)}
                      className="w-fit"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      {tCommon("attachments")} ({attachments.length})
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

            {!readonly ? (
              <Card>
                <CardHeader>
                  <CardTitle>Mode Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isServiceOrder}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setIsServiceOrder(checked);
                        setFormData((prev) => ({
                          ...prev,
                          isServiceOrder: checked,
                          serviceWorkflowStatus: checked
                            ? prev.serviceWorkflowStatus || serviceStatus || "NEW"
                            : null,
                        }));
                      }}
                      disabled={isReadOnly}
                    />
                    Aktifkan mode service untuk order ini
                  </label>

                  <div className="flex items-center gap-2 text-sm">
                    <span>Status:</span>
                    <Badge variant={isServiceOrder ? "secondary" : "outline"}>{isServiceOrder ? "Yes" : "No"}</Badge>
                  </div>

                  {isServiceOrder ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service Status</label>
                      <SearchableSelect
                        value={serviceStatus}
                        onValueChange={(value) => {
                          if (!value) return;
                          const next = value as "NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED";
                          setServiceStatus(next);
                          setFormData((prev) => ({ ...prev, serviceWorkflowStatus: next }));
                          if (isEditing) {
                            void handleServiceStatusChange(next);
                          }
                        }}
                        options={[
                          { value: "NEW", label: "NEW" },
                          { value: "PROCESSING", label: "PROCESSING" },
                          { value: "READY", label: "READY" },
                          { value: "DONE", label: "DONE" },
                          { value: "CLOSED", label: "CLOSED" },
                          { value: "CANCELLED", label: "CANCELLED" },
                        ]}
                        placeholder="Service status"
                        disabled={isReadOnly}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {!readonly ? (
              <Card>
                <CardHeader>
                <CardTitle>Auto Invoice + DP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoCreateInvoicePayment}
                      onChange={(event) => setAutoCreateInvoicePayment(event.target.checked)}
                    />
                    Langsung buat invoice & catat uang muka (DP)
                  </label>
                  {autoCreateInvoicePayment ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CurrencyInput
                        value={downPaymentAmount}
                        onChange={(value) => setDownPaymentAmount(Number(value) || 0)}
                        placeholder="Nominal uang muka (DP)"
                      />
                      <SearchableSelect
                        value={paymentMethodId}
                        onValueChange={(value) => setPaymentMethodId(value || "")}
                        options={paymentMethodOptions.map((method) => ({
                          value: method.id,
                          label: `[${method.method}] ${method.name}`,
                        }))}
                        placeholder="Pilih metode pembayaran DP"
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("ordered_items")}</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 p-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <TableOverflow
                    className="max-w-[calc(100vw-2rem)]"
                    minWidthClassName="min-w-[760px] md:min-w-[860px]"
                  >
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>{tCommon("product")}</TableHead>
                        <TableHead className="w-[120px]">{tCommon("quantity")}</TableHead>
                        <TableHead className="w-[80px]">{tCommon("unit")}</TableHead>
                        <TableHead className="w-[150px]">{tCommon("price")}</TableHead>
                        <TableHead className="w-[150px]">{tCommon("total")}</TableHead>
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
                              <SearchableSelect
                                value={item.productId}
                                onValueChange={(val) =>
                                  handleItemChange(index, "productId", val || "")
                                }
                                options={productOptions}
                                placeholder={tCommon("placeholder_select_product")}
                                disabled={isReadOnly}
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
                                    Number(e.target.value),
                                  )
                                }
                                disabled={isReadOnly}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center text-sm text-muted-foreground">
                                {products?.find(
                                  (p: { id: string }) =>
                                    p.id === item.productId,
                                )?.salesUnit?.symbol ||
                                  products?.find(
                                    (p: { id: string }) =>
                                      p.id === item.productId,
                                  )?.baseUnit?.symbol ||
                                  "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <CurrencyInput
                                value={item.unitPrice}
                                onChange={(val) =>
                                  handleItemChange(
                                    index,
                                    "unitPrice",
                                    Number(val),
                                  )
                                }
                                disabled={isReadOnly}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                                {formatCurrency(item.quantity * item.unitPrice)}
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
                  </TableOverflow>
                </DndContext>
                {formData.items.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No items added.
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
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

        </PageFormContent>
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
        readonly={isReadOnly}
      />
    </PageFormLayout >
  );
}
