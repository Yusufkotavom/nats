"use client";

import { useMemo, useState } from "react";
import {
  createPOSServiceOrder,
  getPOSServiceOrders,
  settlePOSServiceOrder,
  updatePOSServiceOrderStatus,
} from "../actions";
import { POSProduct } from "../types";
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
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  targetDate?: string | null;
  notes?: string | null;
  customerName: string;
  items: ServiceOrderItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ["pos-service-orders", sessionId] });
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
      await createPOSServiceOrder({
        sessionId,
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
      setProductId("");
      setQuantity(1);
      setPrice(0);
      setDownPayment(0);
      setNotes("");
      setTargetDate("");
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

  const handleMoveStatus = async (orderId: string, nextStatus: ServiceOrderStatus) => {
    setStatusLoadingId(orderId);
    try {
      await updatePOSServiceOrderStatus(orderId, nextStatus);
      toast({ title: `Status berhasil diubah ke ${nextStatus}` });
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
                      onClick={() => handleMoveStatus(order.id, nextStatus)}
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
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
