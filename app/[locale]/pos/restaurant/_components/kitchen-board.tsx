"use client";

import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { updateKitchenItemStatus } from "../../actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type KitchenItemStatus = "NEW" | "COOKING" | "READY" | "SERVED" | "CANCELLED";

interface KitchenBoardProps {
  sessionId: string;
  initialData: SuperJSONResult;
}

export function KitchenBoard({ sessionId, initialData }: KitchenBoardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);
  const tickets = useMemo(() => SuperJSON.deserialize<any[]>(initialData), [initialData]);

  const groupedByStation = useMemo(() => {
    const stationMap = new Map<string, any[]>();
    for (const ticket of tickets) {
      for (const item of ticket.items || []) {
        const current = stationMap.get(item.station) || [];
        current.push({ ...item, ticket });
        stationMap.set(item.station, current);
      }
    }
    return Array.from(stationMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tickets]);

  const setStatus = async (itemId: string, status: KitchenItemStatus) => {
    setWorkingItemId(itemId);
    try {
      await updateKitchenItemStatus(itemId, status);
      toast({ title: `Status kitchen -> ${status}` });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Gagal update status kitchen",
      });
    } finally {
      setWorkingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Session ID: <code>{sessionId}</code>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {groupedByStation.length === 0 ? (
          <div className="text-sm text-muted-foreground">Belum ada antrian kitchen aktif.</div>
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
                <div key={item.id} className="rounded-md border p-2 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.product?.name || item.productId}</div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Ticket: {item.ticket.ticketNumber} | Table: {item.ticket.diningSpot?.spotCode}
                  </div>
                  <div>Qty: {item.quantity}</div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={workingItemId === item.id}
                      onClick={() => setStatus(item.id, "COOKING")}
                    >
                      Start
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
    </div>
  );
}
