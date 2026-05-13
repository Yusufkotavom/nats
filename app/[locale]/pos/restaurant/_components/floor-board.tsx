"use client";

import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { openDiningSpot, closeDiningSpot } from "../../actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface FloorBoardProps {
  sessionId: string;
  initialData: SuperJSONResult;
}

function statusVariant(status: string): "default" | "outline" | "secondary" | "destructive" {
  if (status === "AVAILABLE") return "outline";
  if (status === "ORDERING") return "default";
  if (status === "BILLING") return "secondary";
  return "destructive";
}

export function FloorBoard({ sessionId, initialData }: FloorBoardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [workingSpotId, setWorkingSpotId] = useState<string | null>(null);
  const spots = useMemo(() => SuperJSON.deserialize<any[]>(initialData), [initialData]);

  const handleOpen = async (spotId: string) => {
    setWorkingSpotId(spotId);
    try {
      await openDiningSpot(spotId);
      toast({ title: "Meja dibuka" });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Gagal membuka meja",
      });
    } finally {
      setWorkingSpotId(null);
    }
  };

  const handleClose = async (spotId: string) => {
    setWorkingSpotId(spotId);
    try {
      await closeDiningSpot(spotId);
      toast({ title: "Meja ditutup" });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Gagal menutup meja",
      });
    } finally {
      setWorkingSpotId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Session ID:</span>
        <code>{sessionId}</code>
        <Link href="/pos/restaurant/kitchen" className="ml-auto text-primary underline">
          Kitchen Board
        </Link>
        <Link href="/pos/restaurant/billing" className="text-primary underline">
          Billing
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {spots.map((spot) => {
          const activeOrder = spot.restaurantOrders?.[0];
          return (
            <Card key={spot.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{spot.spotCode}</span>
                  <Badge variant={statusVariant(spot.status)}>{spot.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{spot.spotName}</div>
                <div className="text-muted-foreground">Area: {spot.area?.name || "-"}</div>
                {activeOrder ? (
                  <div className="rounded-md border p-2 text-xs space-y-1">
                    <div>Order: {activeOrder.orderNumber}</div>
                    <div>Status: {activeOrder.status}</div>
                    <div>Open Kitchen Tickets: {activeOrder.kitchenTickets?.length || 0}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Belum ada order aktif.</div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={spot.status !== "AVAILABLE" || workingSpotId === spot.id}
                    onClick={() => handleOpen(spot.id)}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={spot.status === "AVAILABLE" || workingSpotId === spot.id}
                    onClick={() => handleClose(spot.id)}
                  >
                    Close
                  </Button>
                  <Link href={`/pos?spot=${spot.id}`} className="inline-flex items-center text-xs text-primary underline">
                    Go POS
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
