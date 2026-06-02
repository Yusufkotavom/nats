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
import { Loader2, Trash2, PlusIcon, CalendarIcon } from "lucide-react";
import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  getPurchaseOrder,
  postPurchaseInvoice,
} from "../actions";
import { TaxRate } from "@/prisma/generated/prisma/client";
import { PurchaseInvoiceWithDetails, PurchaseInvoiceInput } from "../types";
import { PurchaseOrderWithDetails } from "../../orders/types";
import { format, parse, isValid } from "date-fns";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SortableTableRow } from "@/components/ui/sortable-row";
import { generateId } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { useConfirm } from "@/hooks/use-confirm";
import { useToast } from "@/hooks/use-toast";
import { AttachmentDialog, Attachment } from "@/components/ui/attachment-dialog";
import { uploadFile } from "@/app/[locale]/(dashboard)/general/files/actions";
import { Paperclip } from "lucide-react";
import { Department, Project } from "@/prisma/generated/prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";
import { useCompanyProfile } from "@/components/providers/session-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TableOverflow } from "@/components/ui/table-overflow";
import { ProductWithDetails } from "@/app/[locale]/(dashboard)/inventory/types";
import { useFormatCurrency } from "@/hooks";
import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";

interface PurchaseInvoiceFormProps {
  invoice?: SuperJSONResult | null;
  vendors: { id: string; name: string; phone?: string | null; address?: string | null }[];
  purchaseOrders: SuperJSONResult;
  products?: SuperJSONResult | ProductWithDetails[];
  taxRates: TaxRate[];
  departments?: Department[];
  projects?: Project[];
  readonly?: boolean;
  initialPurchaseOrderId?: string;
}

export function PurchaseInvoiceForm({
  invoice: serializedInvoice,
  vendors,
  purchaseOrders: serializedPurchaseOrders,
  products: serializedProducts,
  taxRates,
  departments = [],
  projects = [],
  readonly = false,
  initialPurchaseOrderId,
}: PurchaseInvoiceFormProps) {
  const invoice = serializedInvoice
    ? SuperJSON.deserialize<PurchaseInvoiceWithDetails>(serializedInvoice)
    : undefined;
  const purchaseOrders = SuperJSON.deserialize<PurchaseOrderWithDetails[]>(
    serializedPurchaseOrders,
  );
  const products = Array.isArray(serializedProducts)
    ? serializedProducts
    : serializedProducts
      ? SuperJSON.deserialize<ProductWithDetails[]>(serializedProducts as SuperJSONResult)
      : [];

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!invoice;
  const companyProfile = useCompanyProfile();
  const inputDateFormat = companyProfile?.dateFormat || "dd/MM/yyyy";
  const confirm = useConfirm();
  const { toast } = useToast();
  const [invoiceDateInput, setInvoiceDateInput] = useState(
    invoice?.invoiceDate ? format(new Date(invoice.invoiceDate), inputDateFormat) : format(new Date(), inputDateFormat),
  );
  const [dueDateInput, setDueDateInput] = useState(
    invoice?.dueDate ? format(new Date(invoice.dueDate), inputDateFormat) : format(new Date(), inputDateFormat),
  );

  const [attachments, setAttachments] = useState<Attachment[]>(
    invoice?.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
    })) || []
  );
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const formatCurrency = useFormatCurrency();

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
    departmentId: invoice?.departmentId || undefined,
    projectId: invoice?.projectId || undefined,

    items:
      invoice?.items.map((item) => ({
        id: generateId(),
        description: item.description,
        productId: (item as { productId?: string | null }).productId || undefined,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        taxRateId: item.taxRateId || undefined,
      })) || [],
  });

  const parseManualDate = (value: string): Date | null => {
    const trimmed = value.trim();
    const parsedBySetting = parse(trimmed, inputDateFormat, new Date());
    if (isValid(parsedBySetting)) {
      return parsedBySetting;
    }

    const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/;
    const isoMatch = trimmed.match(isoFormat);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }

    return null;
  };

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

  // When Purchase Order is selected, populate items
  const handlePurchaseOrderChange = async (poId: string) => {
    setFormData((prev) => ({ ...prev, purchaseOrderId: poId }));

    if (poId) {
      try {
        // Note: We might need to fetch full PO details if items are not passed fully,
        // but here we rely on purchaseOrders prop or fetch if needed.
        // Actually getPurchaseOrder action is available.
        const serializedFullPo = await getPurchaseOrder(poId);
        const fullPo = serializedFullPo
          ? SuperJSON.deserialize<PurchaseOrderWithDetails>(serializedFullPo)
          : null;

        if (fullPo) {
          // Auto-select vendor
          setFormData((prev) => ({
            ...prev,
            contactId: fullPo.contactId,
            // Inherit dimensions from PO if available and not already set
            departmentId: fullPo.departmentId || prev.departmentId,
            projectId: fullPo.projectId || prev.projectId
          }));

          // Populate items from PO
          const newItems = fullPo.items.map((item) => ({
            id: generateId(),
            productId: item.productId,
            description: item.product?.name || "Item",
            quantity: item.quantity, // Use original qty or remaining? Usually Bill matches PO.
            unitPrice: Number(item.unitCost),
            discount: 0,
            tax: 0,
            taxRateId: (item as any).taxRateId || taxRates.find(r => r.code === "VAT-S")?.id,
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
          productId: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          tax: 0,
          taxRateId: taxRates.find(r => r.code === "VAT-S")?.id,
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
    value: string | number | undefined,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productId") {
      const product = products.find((p: { id: string }) => p.id === value);
      if (product) {
        newItems[index].description = product.name;
        newItems[index].unitPrice = Number((product as ProductWithDetails).cost || 0);
      }
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const calculateItemValues = (item: (typeof formData.items)[0]) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * ((item.discount || 0) / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);

    let taxAmount = 0;
    if (item.taxRateId) {
      const rateObj = taxRates.find(r => r.id === item.taxRateId);
      if (rateObj) {
        taxAmount = taxableAmount * (Number(rateObj.rate) / 100);
      }
    } else {
      taxAmount = item.tax || 0;
    }

    const total = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, total };
  };

  useEffect(() => {
    const calculatedTotalTax = formData.items.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = subtotal * ((item.discount || 0) / 100);
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = item.taxRateId
        ? taxableAmount *
          ((Number(taxRates.find((r) => r.id === item.taxRateId)?.rate ?? 0)) / 100)
        : (item.tax || 0);
      return sum + taxAmount;
    }, 0);

    // Only update if different to avoid infinite loops (though strict equality check on float might be tricky, usually fine for setFormData)
    if (Math.abs(calculatedTotalTax - formData.totalTax) > 0.001) {
      setFormData((prev) => ({ ...prev, totalTax: calculatedTotalTax }));
    }
  }, [formData.items, formData.totalTax, taxRates]);

  const itemsTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemValues(item).total,
    0,
  );

  const itemsNetTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemValues(item).taxableAmount,
    0,
  );

  const totalAmount =
    itemsTotal -
    (formData.globalDiscount || 0) +
    (formData.shippingCost || 0) +
    (formData.handlingCost || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }
    if (formData.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }
    for (const item of formData.items) {
      if (!item.description) {
        toast({
          title: "Validation Error",
          description: "Please enter description for all items",
          variant: "destructive",
        });
        return;
      }
      if (item.quantity <= 0) {
        toast({
          title: "Validation Error",
          description: "Quantity must be greater than 0",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const submissionData = {
        ...formData,
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        items: formData.items.map(({ id: _id, ...item }) => item),
        attachmentIds: attachments.map((a) => a.id),
      };
      let result;
      if (isEditing && invoice) {
        result = await updatePurchaseInvoice(invoice.id, submissionData);
      } else {
        result = await createPurchaseInvoice(submissionData);
      }

      if (result.success) {
        if (isEditing && invoice) {
          router.push(`/purchase/invoices/${invoice.id}`);
        } else {
          const created = result.data
            ? SuperJSON.deserialize<{ id: string }>(result.data)
            : null;
          if (created?.id) {
            router.push(`/purchase/invoices/${created.id}/edit`);
          } else {
            router.push("/purchase/invoices");
          }
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = async () => {
    if (!invoice) return;
    const summaryItemsCount = invoice.items?.length || 0;
    const summaryTotal = Number(invoice.totalAmount || 0);
    const summaryPaid = (invoice.payments || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
    const summaryRemaining = Math.max(summaryTotal - summaryPaid, 0);
    if (
      !(await confirm({
        title: "Post Invoice",
        description: [
          `Invoice: ${invoice.invoiceNumber}`,
          `Vendor: ${invoice.contact?.name || "-"}`,
          `Jumlah item produk/jasa: ${summaryItemsCount}`,
          `Nominal transaksi: ${formatCurrency(summaryTotal)}`,
          `Sisa tagihan saat ini: ${formatCurrency(summaryRemaining)}`,
          "Aksi ini akan membuat jurnal dan tidak bisa dibatalkan.",
        ].join("\n"),
      }))
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await postPurchaseInvoice(invoice.id);
      if (result.success) {
        toast({
          title: result.data?.processed ? "Posted" : "Queued",
          description: result.data?.processed ? (
            "Invoice posted successfully"
          ) : (
            <span>
              {result.data?.alreadyQueued
                ? "Invoice posting already queued."
                : "Invoice posting queued for processing."}{" "}
              {result.data?.outboxId ? (
                <Link
                  href={`/admin/integrations/outbox?search=${encodeURIComponent(
                    result.data.outboxId,
                  )}`}
                  className="underline"
                >
                  View outbox
                </Link>
              ) : null}
            </span>
          ),
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to post invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter purchase orders based on selected vendor
  const filteredPurchaseOrders = formData.contactId
    ? purchaseOrders.filter((po) => po.contactId === formData.contactId)
    : purchaseOrders;
  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: v.name,
    subtitle: [v.phone, v.address].filter(Boolean).join(" • "),
  }));
  const purchaseOrderOptions = filteredPurchaseOrders.map((po) => ({
    value: po.id,
    label: po.orderNumber,
    subtitle: po.contact?.name || "-",
    meta: formatCurrency(Number(po.totalAmount || 0)),
  }));
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    subtitle: p.category?.name || p.sku || "-",
    meta: formatCurrency(Number(p.cost || 0)),
  }));
  const showDimensionFields = departments.length > 0 || projects.length > 0;

  useEffect(() => {
    if (isEditing || !initialPurchaseOrderId || formData.purchaseOrderId) return;
    void handlePurchaseOrderChange(initialPurchaseOrderId);
  }, [initialPurchaseOrderId, isEditing, formData.purchaseOrderId]);

  return (
    <PageFormLayout>
      <PageFormHeader>
        <PageFormTitle title={isEditing ? "Edit Purchase Invoice" : "New Purchase Invoice"} />
        <PageFormActions className="w-full justify-start md:w-auto md:justify-end">
          <div className="flex w-full flex-wrap gap-2 [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">
          {invoice ? (
            <Button asChild type="button" variant="outline" size="sm">
              <Link
                href={`/admin/integrations/outbox?search=${encodeURIComponent(invoice.id)}`}
              >
                Outbox
              </Link>
            </Button>
          ) : null}
          {invoice?.status === "DRAFT" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePost}
              disabled={isLoading}
            >
              Post Invoice
            </Button>
          )}
          {!readonly && (
            <>
              <Button type="submit" form="purchase-invoice-form" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
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
            Close
          </Button>

          </div>
        </PageFormActions>
      </PageFormHeader>
      <form id="purchase-invoice-form" onSubmit={handleSubmit} className="w-full min-w-0 max-w-full overflow-x-hidden">
        <PageFormContent className="mt-4 grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden border-none bg-transparent p-0 shadow-none">
          <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Purchase Order (Optional)</Label>
                  <SearchableSelect
                    value={formData.purchaseOrderId || ""}
                    onValueChange={(val) =>
                      handlePurchaseOrderChange(val || "")
                    }
                    options={purchaseOrderOptions}
                    placeholder="Select Purchase Order"
                    disabled={readonly}
                  />
                </div>

                {showDimensionFields ? (
                  <div className="grid grid-cols-1 gap-4 md:col-span-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <SearchableSelect
                        value={formData.departmentId || ""}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, departmentId: val || null }))}
                        options={departments.map(d => ({ value: d.id, label: d.name }))}
                        placeholder="Select Department"
                        disabled={readonly}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <SearchableSelect
                        value={formData.projectId || ""}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val || null }))}
                        options={projects.map(p => ({ value: p.id, label: p.name }))}
                        placeholder="Select Project"
                        disabled={readonly}
                      />
                    </div>
                  </div>
                ) : null}

                <CustomInput
                  label="Invoice Number"
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      invoiceNumber: e.target.value,
                    }))
                  }
                  placeholder="Auto-generate if empty"
                  disabled={readonly}
                />

                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <SearchableSelect
                    value={formData.contactId}
                    onValueChange={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        contactId: val || "",
                        purchaseOrderId: undefined,
                      }));
                    }}
                    options={vendorOptions}
                    placeholder="Select Vendor"
                    disabled={readonly || !!formData.purchaseOrderId}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Invoice Date</Label>
                  <div className="flex items-center gap-2">
                    <CustomInput
                      type="text"
                      value={invoiceDateInput}
                      placeholder={inputDateFormat}
                      onChange={(e) => setInvoiceDateInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseManualDate(invoiceDateInput);
                        if (!parsed) {
                          toast({
                            title: "Invalid date",
                            description: `Use format ${inputDateFormat}`,
                            variant: "destructive",
                          });
                          setInvoiceDateInput(format(formData.invoiceDate, inputDateFormat));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, invoiceDate: parsed }));
                        setInvoiceDateInput(format(parsed, inputDateFormat));
                      }}
                      disabled={readonly}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={readonly}
                          className={cn("shrink-0")}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.invoiceDate}
                          onSelect={(date) => {
                            if (!date) return;
                            setFormData((prev) => ({ ...prev, invoiceDate: date }));
                            setInvoiceDateInput(format(date, inputDateFormat));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <div className="flex items-center gap-2">
                    <CustomInput
                      type="text"
                      value={dueDateInput}
                      placeholder={inputDateFormat}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseManualDate(dueDateInput);
                        if (!parsed) {
                          toast({
                            title: "Invalid date",
                            description: `Use format ${inputDateFormat}`,
                            variant: "destructive",
                          });
                          setDueDateInput(format(formData.dueDate, inputDateFormat));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, dueDate: parsed }));
                        setDueDateInput(format(parsed, inputDateFormat));
                      }}
                      disabled={readonly}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={readonly}
                          className={cn("shrink-0")}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => {
                            if (!date) return;
                            setFormData((prev) => ({ ...prev, dueDate: date }));
                            setDueDateInput(format(date, inputDateFormat));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {isEditing && (
                  <CustomSelect
                    value={formData.status}
                    label="Status"
                     
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
                <div className="md:col-span-2">
                  <div className="flex flex-col gap-2">
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

            <Card className="w-full min-w-0 max-w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 p-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <TableOverflow
                    className="max-w-[calc(100vw-2rem)]"
                    minWidthClassName="min-w-[980px] md:min-w-[1100px]"
                  >
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="min-w-[220px] whitespace-nowrap">Product</TableHead>
                        <TableHead className="w-[110px] whitespace-nowrap">Qty</TableHead>
                        <TableHead className="w-[150px] whitespace-nowrap">Unit Price</TableHead>
                        <TableHead className="w-[130px] whitespace-nowrap">
                          Discount (%)
                        </TableHead>
                        <TableHead className="w-[260px] whitespace-nowrap">Tax Rate</TableHead>
                        <TableHead className="w-[140px] whitespace-nowrap">Total</TableHead>
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
                            <TableCell className="min-w-[220px]">
                              <SearchableSelect
                                value={item.productId || ""}
                                onValueChange={(val) =>
                                  handleItemChange(index, "productId", val || "")
                                }
                                options={productOptions}
                                placeholder="Select Product"
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
                                    parseInt(e.target.value) || 0,
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
                                    Number(val),
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
                                    Number(e.target.value),
                                  )
                                }
                                disabled={readonly}
                              />
                            </TableCell>
                            <TableCell className="w-[260px]">
                              <div className="flex items-center gap-2">
                              <select
                                className="flex h-10 w-full min-w-[160px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={item.taxRateId || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "taxRateId",
                                    e.target.value === "" ? undefined : e.target.value
                                  )
                                }
                                disabled={readonly}
                              >
                                <option value="">Manual</option>
                                {taxRates.map((rate) => (
                                  <option key={rate.id} value={rate.id}>
                                    {rate.name} ({Number(rate.rate)}%)
                                  </option>
                                ))}
                              </select>
                              {!item.taxRateId && (
                                <CustomInput
                                  type="number"
                                  min="0"
                                  value={item.tax}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "tax",
                                      Number(e.target.value),
                                    )
                                  }
                                  disabled={readonly}
                                  className="w-[88px]"
                                  placeholder="Amount"
                                />
                              )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                                {calculateItemValues(
                                  item,
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
                  </TableOverflow>
                </DndContext>
                {formData.items.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No items added.
                  </div>
                )}
                <div className="flex flex-col gap-4 border-t p-4 sm:flex-row sm:items-start sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={readonly}
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={handleAddItem}
                  >
                    <PlusIcon /> Add Item
                  </Button>
                  <div className="w-full space-y-2 sm:w-1/3">
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
                        className="h-8 w-24"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium">Total Tax</span>
                      <CurrencyInput
                        value={formData.totalTax}
                        onChange={() => { }}
                        disabled={true}
                        className="h-8 w-24 bg-muted"
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
                        className="h-8 w-24"
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
                        className="h-8 w-24"
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
        readonly={readonly}
      />
    </PageFormLayout>
  );
}
