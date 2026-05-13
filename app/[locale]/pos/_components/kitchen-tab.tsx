"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import {
  getKitchenTicketForPrint,
  getKitchenTickets,
  updateKitchenItemStatus,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Printer } from "lucide-react";
import {
  KitchenTicketPrintDialog,
  type KitchenTicketPrintPayload,
} from "./kitchen-ticket-print-dialog";

type KitchenItemStatus = "NEW" | "COOKING" | "READY" | "SERVED" | "CANCELLED";

interface KitchenTabProps {
  sessionId: string;
}

export function KitchenTab({ sessionId }: KitchenTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);
  const [reprintTicketId, setReprintTicketId] = useState<string | null>(null);
  const [reprintPayload, setReprintPayload] =
    useState<KitchenTicketPrintPayload | null>(null);
  const [reprintOpen, setReprintOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pos-kitchen-tickets", sessionId],
    queryFn: async () => {
      const serialized = await getKitchenTickets(sessionId);
      return SuperJSON.deserialize<any[]>(serialized);
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const tickets = useMemo(() => data ?? [], [data]);

  const groupedByStation = useMemo(() => {
    const stationMap = new Map<string, any[]>();
    for (const ticket of tickets) {
      for (const item of ticket.items || []) {
        const current = stationMap.get(item.station) || [];
        current.push({ ...item, ticket });
        stationMap.set(item.station, current);
      }
    }
    return Array.from(stationMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [tickets]);

  const setStatus = async (itemId: string, status: KitchenItemStatus) => {
    setWorkingItemId(itemId);
    try {
      await updateKitchenItemStatus(itemId, status);
      toast({ title: `Status kitchen -> ${status}` });
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["pos-floor-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["pos-billing-queue"] }),
      ]);
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          error instanceof Error
            ? error.message
            : "Gagal update status kitchen",
      });
    } finally {
      setWorkingItemId(null);
    }
  };

  const handleReprint = async (ticketId: string) => {
    setReprintTicketId(ticketId);
    try {
      const serialized = await getKitchenTicketForPrint(ticketId);
      const data = SuperJSON.deserialize<{
        ticketId: string;
        ticketNumber: string;
        orderId: string;
        orderNumber: string;
        sessionNumber: string | null;
        cashierName: string | null;
        sentAt: Date;
        spotCode: string | null;
        spotName: string | null;
        areaName: string | null;
        note: string | null;
        items: Array<{
          productId: string;
          productName: string;
          sku?: string;
          quantity: number;
          station: string;
          note?: string;
        }>;
      } | null>(serialized as any);
      if (!data) {
        throw new Error("Tiket tidak ditemukan");
      }
      setReprintPayload({
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        sessionNumber: data.sessionNumber ?? undefined,
        cashierName: data.cashierName ?? undefined,
        sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
        spotCode: data.spotCode ?? undefined,
        spotName: data.spotName ?? undefined,
        areaName: data.areaName ?? undefined,
        note: data.note ?? undefined,
        items: data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          note: item.note,
        })),
      });
      setReprintOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          error instanceof Error ? error.message : "Gagal memuat tiket",
      });
    } finally {
      setReprintTicketId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Memuat antrian dapur...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {tickets.length > 0 ? (
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Tiket Aktif</div>
          <div className="flex flex-wrap gap-2">
            {tickets.map((ticket: any) => (
              <Button
                key={ticket.id}
                size="sm"
                variant="outline"
                className="h-8"
                disabled={reprintTicketId === ticket.id}
                onClick={() => handleReprint(ticket.id)}
              >
                <Printer className="mr-1 h-3 w-3" />
                {ticket.ticketNumber}
                <span className="ml-2 text-xs text-muted-foreground">
                  {ticket.diningSpot?.spotCode}
                </span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {groupedByStation.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Belum ada antrian dapur aktif.
          </div>
        ) : null}
        {groupedByStation.map(([station, items]) => (
          <Card key={station}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{station}</span>
                <Badge variant="outline">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border p-2 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">
                      {item.product?.name || item.productId}
                    </div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Ticket: {item.ticket.ticketNumber} | Table:{" "}
                    {item.ticket.diningSpot?.spotCode}
                  </div>
                  <div>Qty: {item.quantity}</div>
                  {item.note ? (
                    <div className="text-muted-foreground">
                      Note: {item.note}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={workingItemId === item.id}
                      onClick={() => setStatus(item.id, "COOKING")}
                    >
                      Masak
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={workingItemId === item.id}
                      onClick={() => setStatus(item.id, "READY")}
                    >
                      Ready
                    </Button>
                    <Button
                      size="sm"
                      disabled={workingItemId === item.id}
                      onClick={() => setStatus(item.id, "SERVED")}
                    >
                      Served
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <KitchenTicketPrintDialog
        open={reprintOpen}
        onOpenChange={(open) => {
          setReprintOpen(open);
          if (!open) setReprintPayload(null);
        }}
        payload={reprintPayload}
      />
    </div>
  );
}
