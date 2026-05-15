"use client";

import { useMemo, useState } from "react";
import {
  createPOSServiceOrder,
  getPOSServiceOrders,
  getPOSContacts,
  settlePOSServiceOrder,
  updatePOSServiceOrderStatus,
} from "../actions";
import { POSContactOption, POSProduct } from "../types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings2, Wallet } from "lucide-react";
import { QuickContactDialog } from "./quick-contact-dialog";
import { buildMailtoUrl, buildWhatsAppUrl } from "./contact-communication";
import { usePathname } from "next/navigation";
import {
  buildServiceOrderCreatedMessage,
  buildServicePaymentReceivedMessage,
  buildServiceStatusUpdatedMessage,
} from "@/lib/communication/service-whatsapp";
import { createContactCommunicationLog } from "@/app/[locale]/communications/actions";

type ServiceOrderStatus =
  | "NEW"
  | "PROCESSING"
  | "READY"
  | "DONE"
  | "CLOSED"
  | "CANCELLED";
type ServicePaymentMethod = "CASH" | "CARD" | "QRIS";

type ServiceOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: string;
  hasActiveBom: boolean;
};

type ServiceOrder = {
  id: string;
  orderNumber: string;
  status: ServiceOrderStatus;
  contactId?: string | null;
  salesInvoiceId?: string | null;
  latestCommunicationAt?: Date | string | null;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  targetDate?: string | null;
  notes?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: ServiceOrderItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function nextStatusOptions(status: ServiceOrderStatus): ServiceOrderStatus[] {
  const map: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
    NEW: ["PROCESSING", "READY", "CANCELLED"],
    PROCESSING: ["READY", "DONE", "CANCELLED"],
    READY: ["DONE", "CANCELLED"],
    DONE: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };
  return map[status];
}

interface ServiceWorkflowPanelProps {
  sessionId: string;
  products: POSProduct[];
}

export function ServiceWorkflowPanel({ sessionId, products }: ServiceWorkflowPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<ServicePaymentMethod>("CASH");
  const [notes, setNotes] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [settleLoadingId, setSettleLoadingId] = useState<string | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [quickContactOpen, setQuickContactOpen] = useState(false);

  const serviceProducts = useMemo(
    () => products.filter((product) => product.isService),
    [products],
  );

  const selectedProduct = useMemo(
    () => serviceProducts.find((product) => product.id === productId),
    [productId, serviceProducts],
  );

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["pos-service-orders", sessionId],
    queryFn: async () => {
      const raw = await getPOSServiceOrders(sessionId);
      return SuperJSON.deserialize<ServiceOrder[]>(raw);
    },
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["pos-contacts"],
    queryFn: async () => {
      const raw = await getPOSContacts();
      return SuperJSON.deserialize<POSContactOption[]>(raw);
    },
  });

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ["pos-service-orders", sessionId] });
  };

  const sendServiceUpdate = async (
    name: string,
    phone: string | null | undefined,
    email: string | null | undefined,
    message: string,
    subject: string,
    logInput: {
      contactId: string;
      eventType:
        | "SERVICE_CREATED"
        | "SERVICE_STATUS_UPDATED"
        | "SERVICE_PAYMENT_RECEIVED";
      sourceId: string;
      target?: string;
      documentLinks?: Array<{ label: string; url: string }>;
    },
  ) => {
    const waUrl = buildWhatsAppUrl(phone, message);
    if (waUrl) {
      await createContactCommunicationLog({
        contactId: logInput.contactId,
        eventType: logInput.eventType,
        sourceType: "SERVICE_ORDER",
        sourceId: logInput.sourceId,
        target: logInput.target || phone || undefined,
        message,
        status: "SENT",
        documentLinks: logInput.documentLinks || [],
      });
      window.open(waUrl, "_blank", "noopener,noreferrer");
      return true;
    }

    const mailtoUrl = buildMailtoUrl(email, subject, message);
    if (mailtoUrl) {
      await createContactCommunicationLog({
        contactId: logInput.contactId,
        eventType: logInput.eventType,
        sourceType: "SERVICE_ORDER",
        sourceId: logInput.sourceId,
        target: email || undefined,
        message,
        status: "SENT",
        channel: "EMAIL",
        documentLinks: logInput.documentLinks || [],
      });
      window.open(mailtoUrl, "_blank", "noopener,noreferrer");
      return true;
    }

    await createContactCommunicationLog({
      contactId: logInput.contactId,
      eventType: logInput.eventType,
      sourceType: "SERVICE_ORDER",
      sourceId: logInput.sourceId,
      target: logInput.target || phone || email || undefined,
      message,
      status: "FAILED",
      documentLinks: logInput.documentLinks || [],
      errorMessage: "Kontak belum punya nomor WhatsApp/email",
    });

    toast({
      variant: "destructive",
      title: `Kontak ${name} belum punya nomor WhatsApp/email`,
    });
    return false;
  };

  const handleCreate = async () => {
    if (!productId || quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Produk service dan quantity wajib diisi",
      });
      return;
    }

    setCreating(true);
    try {
      const createdRaw = await createPOSServiceOrder({
        sessionId,
        customerId: customerId === "walk-in" ? undefined : customerId,
        notes: notes.trim() || undefined,
        targetDate: targetDate ? new Date(`${targetDate}T00:00:00`) : undefined,
        downPaymentAmount: downPayment > 0 ? downPayment : undefined,
        paymentMethod: downPayment > 0 ? paymentMethod : undefined,
        items: [
          {
            productId,
            quantity,
            price: price > 0 ? price : selectedProduct?.price,
          },
        ],
      });

      toast({ title: "Service order berhasil dibuat" });
      const createdOrder = SuperJSON.deserialize<{
        id: string;
        orderNumber: string;
        salesInvoiceId?: string | null;
        totalAmount: string;
        paidAmount: string;
        remainingAmount: string;
        targetDate?: string | null;
      }>(createdRaw);

      const selectedCustomer =
        customerId === "walk-in"
          ? null
          : contacts.find((contact) => contact.id === customerId) || null;
      if (selectedCustomer) {
        const locale = pathname.split("/").filter(Boolean)[0] || "id";
        const baseUrl = window.location.origin;
        const invoiceUrl = createdOrder.salesInvoiceId
          ? `${baseUrl}/${locale}/reporting/preview?code=SALES_INVOICE&invoiceId=${createdOrder.salesInvoiceId}`
          : null;
        const receiptUrl = createdOrder.salesInvoiceId
          ? `${baseUrl}/${locale}/reporting/preview?code=POS_RECEIPT&invoiceId=${createdOrder.salesInvoiceId}`
          : null;
        const targetDateLabel = targetDate
          ? new Date(`${targetDate}T00:00:00`).toLocaleDateString("id-ID")
          : "-";
        const message = buildServiceOrderCreatedMessage({
          customerName: selectedCustomer.name,
          orderNumber: createdOrder.orderNumber,
          itemsSummary: `${selectedProduct?.name || "Service"} x${quantity}`,
          totalAmount: Number(createdOrder.totalAmount || 0),
          downPaymentAmount: downPayment > 0 ? downPayment : Number(createdOrder.paidAmount || 0),
          remainingAmount: Number(createdOrder.remainingAmount || 0),
          targetDateLabel,
        });
        await sendServiceUpdate(
          selectedCustomer.name,
          selectedCustomer.phone,
          selectedCustomer.email,
          message,
          "Info Service Masuk",
          {
            contactId: selectedCustomer.id,
            eventType: "SERVICE_CREATED",
            sourceId: createdOrder.id || createdOrder.orderNumber,
            target: selectedCustomer.phone || undefined,
            documentLinks: [
              invoiceUrl ? { label: "Invoice PDF", url: invoiceUrl } : null,
              receiptUrl ? { label: "POS Receipt", url: receiptUrl } : null,
            ].filter(Boolean) as Array<{ label: string; url: string }>,
          },
        );
      }

      setProductId("");
      setQuantity(1);
      setPrice(0);
      setDownPayment(0);
      setNotes("");
      setTargetDate("");
      setCustomerId("walk-in");
      await refreshOrders();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal membuat service order",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleMoveStatus = async (order: ServiceOrder, nextStatus: ServiceOrderStatus) => {
    setStatusLoadingId(order.id);
    try {
      await updatePOSServiceOrderStatus(order.id, nextStatus);
      toast({ title: `Status berhasil diubah ke ${nextStatus}` });
      if (
        order.contactId &&
        order.customerName &&
        (order.customerPhone || order.customerEmail)
      ) {
        const locale = pathname.split("/").filter(Boolean)[0] || "id";
        const baseUrl = window.location.origin;
        const invoiceUrl = order.salesInvoiceId
          ? `${baseUrl}/${locale}/reporting/preview?code=SALES_INVOICE&invoiceId=${order.salesInvoiceId}`
          : null;
        const receiptUrl = order.salesInvoiceId
          ? `${baseUrl}/${locale}/reporting/preview?code=POS_RECEIPT&invoiceId=${order.salesInvoiceId}`
          : null;
        const message = buildServiceStatusUpdatedMessage({
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          status: nextStatus,
          readyToPickup: nextStatus === "READY" || nextStatus === "DONE",
        });
        await sendServiceUpdate(
          order.customerName,
          order.customerPhone,
          order.customerEmail,
          message,
          "Update Status Service",
          {
            contactId: order.contactId,
            eventType: "SERVICE_STATUS_UPDATED",
            sourceId: order.id,
            target: order.customerPhone || undefined,
            documentLinks: [
              invoiceUrl ? { label: "Invoice PDF", url: invoiceUrl } : null,
              receiptUrl ? { label: "POS Receipt", url: receiptUrl } : null,
            ].filter(Boolean) as Array<{ label: string; url: string }>,
          },
        );
      }
      await refreshOrders();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal ubah status",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleSettle = async (order: ServiceOrder) => {
    const remaining = Number(order.remainingAmount || 0);
    if (remaining <= 0) {
      toast({ title: "Order ini sudah lunas" });
      return;
    }

    setSettleLoadingId(order.id);
    try {
      await settlePOSServiceOrder(order.id, "CASH", remaining);
      toast({ title: "Pelunasan berhasil" });
      if (
        order.contactId &&
        order.customerName &&
        (order.customerPhone || order.customerEmail)
      ) {
        const locale = pathname.split("/").filter(Boolean)[0] || "id";
        const baseUrl = window.location.origin;
        const invoiceUrl = order.salesInvoiceId
          ? `${baseUrl}/${locale}/reporting/preview?code=SALES_INVOICE&invoiceId=${order.salesInvoiceId}`
          : null;
        const receiptUrl = order.salesInvoiceId
          ? `${baseUrl}/${locale}/reporting/preview?code=POS_RECEIPT&invoiceId=${order.salesInvoiceId}`
          : null;
        const message = buildServicePaymentReceivedMessage({
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          paymentAmount: remaining,
          remainingAmount: 0,
        });
        await sendServiceUpdate(
          order.customerName,
          order.customerPhone,
          order.customerEmail,
          message,
          "Bukti Pembayaran Service",
          {
            contactId: order.contactId,
            eventType: "SERVICE_PAYMENT_RECEIVED",
            sourceId: order.id,
            target: order.customerPhone || undefined,
            documentLinks: [
              invoiceUrl ? { label: "Invoice PDF", url: invoiceUrl } : null,
              receiptUrl ? { label: "POS Receipt", url: receiptUrl } : null,
            ].filter(Boolean) as Array<{ label: string; url: string }>,
          },
        );
      }
      await refreshOrders();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal pelunasan",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSettleLoadingId(null);
    }
  };

  const handleQuickInform = (
    name: string,
    phone?: string | null,
    email?: string | null,
  ) => {
    const message = `Halo ${name}, order service Anda sedang kami proses. Hubungi kami jika ada revisi detail pesanan.`;
    const waUrl = buildWhatsAppUrl(phone, message);
    if (waUrl) {
      window.open(waUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const mailtoUrl = buildMailtoUrl(email, "Update Service Order", message);
    if (mailtoUrl) {
      window.open(mailtoUrl, "_blank", "noopener,noreferrer");
      return;
    }

    toast({
      variant: "destructive",
      title: "Kontak belum punya nomor WhatsApp/email",
    });
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Buat Service Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Produk Service</Label>
            <Select
              value={productId}
              onValueChange={(value) => {
                setProductId(value);
                const product = serviceProducts.find((item) => item.id === value);
                if (product) {
                  setPrice(product.price);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih produk service" />
              </SelectTrigger>
              <SelectContent>
                {serviceProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Walk-in Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setQuickContactOpen(true)}>
                + Quick Contact
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={customerId === "walk-in"}
                onClick={() => {
                  const selected = contacts.find((item) => item.id === customerId);
                  if (!selected) return;
                  handleQuickInform(selected.name, selected.phone, selected.email);
                }}
              >
                Quick Inform
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Qty</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value || 1))}
              />
            </div>
            <div className="space-y-1">
              <Label>Harga</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(Number(event.target.value || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>DP</Label>
              <Input
                type="number"
                min={0}
                value={downPayment}
                onChange={(event) => setDownPayment(Number(event.target.value || 0))}
              />
            </div>
            <div className="space-y-1">
              <Label>Metode DP</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as ServicePaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Target Selesai</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Detail kebutuhan pelanggan"
            />
          </div>

          <Button onClick={handleCreate} disabled={creating || serviceProducts.length === 0} className="w-full">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Buat Order Service
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Service Queue</span>
            <Badge variant="secondary">{orders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-16rem)] space-y-3 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading queue...</div>
          ) : null}

          {!isLoading && orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Belum ada service order</div>
          ) : null}

          {orders.map((order) => {
            const remaining = Number(order.remainingAmount || 0);
            const total = Number(order.totalAmount || 0);
            const nextStatuses = nextStatusOptions(order.status);
            return (
              <div key={order.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.customerName}</p>
                    {order.latestCommunicationAt ? (
                      <p className="text-[11px] text-muted-foreground">
                        Kontak terakhir: {formatDateTime(order.latestCommunicationAt)}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline">{order.status}</Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-medium text-foreground">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining</span>
                    <span className={remaining > 0 ? "font-medium text-amber-600" : "font-medium text-emerald-600"}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                  {order.items.length > 0 ? (
                    <div className="pt-1 text-[11px]">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <span>{item.productName} x{item.quantity}</span>
                          {item.hasActiveBom ? <span className="text-blue-600">BOM</span> : <span>Service</span>}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {nextStatuses.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      size="sm"
                      variant="outline"
                      disabled={statusLoadingId === order.id}
                      onClick={() => handleMoveStatus(order, nextStatus)}
                    >
                      {statusLoadingId === order.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Settings2 className="mr-1 h-3 w-3" />}
                      {nextStatus}
                    </Button>
                  ))}

                  {remaining > 0 ? (
                    <Button
                      size="sm"
                      disabled={settleLoadingId === order.id}
                      onClick={() => handleSettle(order)}
                    >
                      {settleLoadingId === order.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wallet className="mr-1 h-3 w-3" />}
                      Pelunasan
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleQuickInform(
                        order.customerName,
                        order.customerPhone,
                        order.customerEmail,
                      )
                    }
                  >
                    Quick Inform
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <QuickContactDialog
        open={quickContactOpen}
        onOpenChange={setQuickContactOpen}
        onCreated={(contact) => {
          queryClient.invalidateQueries({ queryKey: ["pos-contacts"] });
          setCustomerId(contact.id);
        }}
      />
    </div>
  );
}
