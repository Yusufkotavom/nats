"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  InventoryMovement,
  InventoryMovementDetail,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomPagination } from "@/components/ui/custom-pagination";

export type BatchWithDetails = InventoryMovement & {
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
  details: (InventoryMovementDetail & {
    product: Product;
  })[];
};

interface BatchTableProps {
  batches: BatchWithDetails[];
  totalEntries: number;
}

export function BatchTable({ batches, totalEntries }: BatchTableProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No movement batches found.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => <BatchRow key={batch.id} batch={batch} />)
            )}
          </TableBody>
        </Table>
      </div>
      <CustomPagination totalEntries={totalEntries} pageSize={10} />
    </div>
  );
}

function BatchRow({ batch }: { batch: BatchWithDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          {format(new Date(batch.transactionDate), "MMM d, yyyy HH:mm")}
        </TableCell>
        <TableCell>
          <Badge
            variant={
              batch.type === "IN"
                ? "default"
                : batch.type === "OUT"
                ? "destructive"
                : batch.type === "TRANSFER"
                ? "outline"
                : "secondary"
            }
          >
            {batch.type}
          </Badge>
        </TableCell>
        <TableCell>{batch.reference || "-"}</TableCell>
        <TableCell>{batch.fromWarehouse?.name || "-"}</TableCell>
        <TableCell>{batch.toWarehouse?.name || "-"}</TableCell>
        <TableCell>{batch.details.length} items</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={7} className="p-0">
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.details.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.product.sku}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.product.name}
                        </div>
                      </TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(m.unitCost))}
                      </TableCell>
                      <TableCell>{m.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
