"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import {
  closeRestaurantOrder,
  generateRestaurantBill,
  getRestaurantBillingQueue,
  settleRestaurantBill,
  type POSCheckoutSettings,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useToast } from "@/hooks/use-toast";

interface BillingTabProps {
  sessionId: string;
  checkoutSettings: POSCheckoutSettings;
}

export function BillingTab({ sessionId, checkoutSettings }: BillingTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pos-billing-queue", sessionId],
    queryFn: async () => {
      const serialized = await getRestaurantBillingQueue(sessionId);
      return SuperJSON.deserialize<any[]>(serialized);
    },
    refetchInterval: 30_000,
    staleTime: 5_000,
  });

  const orders = useMemo(() => data ?? [], [data]);

  const invalidateAll = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["pos-floor-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["pos-kitchen-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["diningSpots"] }),
    ]);
  };

  const handleGenerateBill = async (order: any) => {
    setWorkingOrderId(order.id);
    try {
      const subtotal = order.items.reduce(
        (sum: number, item: any) =>
          sum +
          Number(item.unitPrice || 0) *
            (item.servedQuantity > 0
              ? item.servedQuantity
              : item.orderedQuantity),
        0,
      );
      const taxableBase = Math.max(
        0,
        subtotal -
          Number(order.itemDiscount || 0) -
          Number(order.globalDiscount || 0),
      );
      const feeLines = (checkoutSettings.feeLines || []).map((line) => ({
        name: line.name,
        category: line.category,
        valueType: line.valueType,
        value: line.value,
        amount:
          line.valueType === "PERCENTAGE"
            ? taxableBase * (line.value / 100)
            : line.value,
      }));

      await generateRestaurantBill(sessionId, order.id, { lines: feeLines });
      toast({ title: "Invoice berhasil dibuat" });
      await invalidateAll();
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          error instanceof Error ? error.message : "Gagal generate bill",
      });
    } finally {
      setWorkingOrderId(null);
    }
  };

  const handleSettle = async (
    orderId: string,
    method: "CASH" | "CARD" | "QRIS",
  ) => {
    setWorkingOrderId(orderId);
    try {
      await settleRestaurantBill(sessionId, orderId, method);
      toast({ title: "Pembayaran berhasil" });
      await invalidateAll();
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          error instanceof Error ? error.message : "Gagal settlement payment",
      });
    } finally {
      setWorkingOrderId(null);
    }
  };

  const handleCloseOrder = async (orderId: string) => {
    setWorkingOrderId(orderId);
    try {
      await closeRestaurantOrder(orderId);
      toast({ title: "Order dan meja ditutup" });
      await invalidateAll();
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          error instanceof Error ? error.message : "Gagal menutup order",
      });
    } finally {
      setWorkingOrderId(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Memuat antrian billing...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {orders.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Tidak ada order untuk billing.
        </div>
      ) : null}

      {orders.map((order) => {
        const subtotal = order.items.reduce(
          (sum: number, item: any) =>
            sum + Number(item.unitPrice || 0) * item.orderedQuantity,
          0,
        );
        const servedSubtotal = order.items.reduce(
          (sum: number, item: any) =>
            sum +
            Number(item.unitPrice || 0) *
              (item.servedQuantity > 0
                ? item.servedQuantity
                : item.orderedQuantity),
          0,
        );
        const invoice = order.salesInvoice;
        const paidAmount =
          invoice?.payments?.reduce(
            (sum: number, p: any) => sum + Number(p.amount || 0),
            0,
          ) || 0;

        return (
          <Card key={order.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{order.orderNumber}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {order.diningSpot?.spotCode}
                  </Badge>
                  <Badge>{order.status}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-1 md:grid-cols-3">
                <div>Subtotal Order: {formatCurrency(subtotal)}</div>
                <div>Subtotal Final: {formatCurrency(servedSubtotal)}</div>
                <div>Invoice: {invoice?.invoiceNumber || "-"}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-medium mb-1">Items</div>
                <div className="space-y-1 text-xs">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{item.product?.name || item.productId}</span>
                      <span>
                        {item.servedQuantity > 0
                          ? item.servedQuantity
                          : item.orderedQuantity}{" "}
                        x {formatCurrency(Number(item.unitPrice || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {invoice ? (
                <div className="text-xs text-muted-foreground">
                  Paid: {formatCurrency(paidAmount)} | Balance:{" "}
                  {formatCurrency(Number(invoice.balanceDue || 0))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!invoice || workingOrderId === order.id}
                  onClick={() => handleGenerateBill(order)}
                >
                  Generate Bill
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !invoice ||
                    Number(invoice.balanceDue || 0) <= 0 ||
                    workingOrderId === order.id
                  }
                  onClick={() => handleSettle(order.id, "CASH")}
                >
                  Bayar Cash
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    !invoice ||
                    Number(invoice.balanceDue || 0) <= 0 ||
                    workingOrderId === order.id
                  }
                  onClick={() => handleSettle(order.id, "CARD")}
                >
                  Bayar Card
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    !invoice ||
                    Number(invoice.balanceDue || 0) <= 0 ||
                    workingOrderId === order.id
                  }
                  onClick={() => handleSettle(order.id, "QRIS")}
                >
                  Bayar QRIS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    order.status !== "PAID" || workingOrderId === order.id
                  }
                  onClick={() => handleCloseOrder(order.id)}
                >
                  Tutup Meja
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
