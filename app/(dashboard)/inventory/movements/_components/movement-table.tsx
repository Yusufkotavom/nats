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
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";
import { formatDate } from "@/lib/utils";

type MovementWithDetails = InventoryMovement & {
  product: Omit<Product, "price" | "cost"> & { price: number; cost: number };
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
};

interface MovementTableProps {
  movements: MovementWithDetails[];
}

export function MovementTable({ movements }: MovementTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No movements found.
              </TableCell>
            </TableRow>
          ) : (
            movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatDate(m.createdAt)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      m.type === "IN"
                        ? "default"
                        : m.type === "OUT"
                        ? "destructive"
                        : m.type === "TRANSFER"
                        ? "outline"
                        : "secondary"
                    }
                  >
                    {m.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{m.product.sku}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.product.name}
                  </div>
                </TableCell>
                <TableCell>{m.fromWarehouse?.name || "-"}</TableCell>
                <TableCell>{m.toWarehouse?.name || "-"}</TableCell>
                <TableCell>{m.reference || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
