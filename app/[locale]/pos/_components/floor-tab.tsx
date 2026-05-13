"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import {
  closeDiningSpot,
  getRestaurantFloorOverview,
  openDiningSpot,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function statusVariant(
  status: string,
): "default" | "outline" | "secondary" | "destructive" {
  if (status === "AVAILABLE") return "outline";
  if (status === "ORDERING") return "default";
  if (status === "BILLING") return "secondary";
  return "destructive";
}

interface FloorTabProps {
  sessionId: string;
  selectedDiningSpotId: string;
  onSelectSpot: (spotId: string, goCashier?: boolean) => void;
}

export function FloorTab({
  sessionId,
  selectedDiningSpotId,
  onSelectSpot,
}: FloorTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workingSpotId, setWorkingSpotId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pos-floor-overview", sessionId],
    queryFn: async () => {
      const serialized = await getRestaurantFloorOverview(sessionId);
      return SuperJSON.deserialize<any[]>(serialized);
    },
    staleTime: 10_000,
  });

  const spots = useMemo(() => data ?? [], [data]);

  const invalidateAll = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["diningSpots"] }),
      queryClient.invalidateQueries({ queryKey: ["pos-kitchen-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["pos-billing-queue"] }),
    ]);
  };

  const handleOpen = async (spotId: string) => {
    setWorkingSpotId(spotId);
    try {
      await openDiningSpot(spotId);
      toast({ title: "Meja dibuka" });
      onSelectSpot(spotId, true);
      await invalidateAll();
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
      await invalidateAll();
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Gagal menutup meja",
      });
    } finally {
      setWorkingSpotId(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Memuat data meja...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Pilih meja untuk mulai menerima order waiter.</span>
        {selectedDiningSpotId ? (
          <Badge variant="outline" className="ml-auto">
            Aktif: {selectedDiningSpotId}
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {spots.map((spot) => {
          const activeOrder = spot.restaurantOrders?.[0];
          const isSelected = spot.id === selectedDiningSpotId;
          return (
            <Card
              key={spot.id}
              className={isSelected ? "ring-2 ring-primary" : undefined}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{spot.spotCode}</span>
                  <Badge variant={statusVariant(spot.status)}>
                    {spot.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{spot.spotName}</div>
                <div className="text-muted-foreground">
                  Area: {spot.area?.name || "-"}
                </div>
                {activeOrder ? (
                  <div className="rounded-md border p-2 text-xs space-y-1">
                    <div>Order: {activeOrder.orderNumber}</div>
                    <div>Status: {activeOrder.status}</div>
                    <div>
                      Open Kitchen Tickets:{" "}
                      {activeOrder.kitchenTickets?.length || 0}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Belum ada order aktif.
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      spot.status !== "AVAILABLE" || workingSpotId === spot.id
                    }
                    onClick={() => handleOpen(spot.id)}
                  >
                    Buka
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      spot.status === "AVAILABLE" || workingSpotId === spot.id
                    }
                    onClick={() => handleClose(spot.id)}
                  >
                    Tutup
                  </Button>
                  <Button
                    size="sm"
                    disabled={spot.status === "AVAILABLE"}
                    onClick={() => onSelectSpot(spot.id, true)}
                  >
                    Ambil Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
