import { getMovementBatchById } from "../actions";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MovementActions } from "./_components/movement-actions";
import { cn } from "@/lib/utils";

export default async function MovementDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getMovementBatchById(id);

  if (!batch) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Movement Details</h2>
        <div className="ml-auto">
          <MovementActions batchId={batch.id} status={batch.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.reference || "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                batch.status === "COMPLETED" || batch.status === "APPROVED"
                  ? "default"
                  : batch.status === "PENDING"
                  ? "outline"
                  : batch.status === "REJECTED"
                  ? "destructive"
                  : "secondary"
              }
              className={cn(
                batch.status === "PENDING" &&
                  "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                batch.status === "COMPLETED" &&
                  "bg-green-100 text-green-800 hover:bg-green-100",
                batch.status === "REJECTED" &&
                  "bg-red-100 text-red-800 hover:bg-red-100"
              )}
            >
              {batch.status}
            </Badge>
            {batch.rejectionReason && (
              <p className="mt-2 text-xs text-muted-foreground">
                Reason: {batch.rejectionReason}
              </p>
            )}
            {batch.approvedBy && (
              <p className="mt-2 text-xs text-muted-foreground">
                Approved by: {batch.approvedBy.name}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(batch.transactionDate), "MMM d, yyyy")}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(batch.transactionDate), "HH:mm")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {batch.fromWarehouse?.name || "External / Adjustment"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {batch.toWarehouse?.name || "External / Adjustment"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.details.map((detail) => (
                <TableRow key={detail.id}>
                  <TableCell>
                    <div className="font-medium">{detail.product.sku}</div>
                    <div className="text-xs text-muted-foreground">
                      {detail.product.name}
                    </div>
                  </TableCell>
                  <TableCell>{detail.quantity}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(detail.unitCost.toNumber())}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(detail.unitCost.toNumber() * detail.quantity)}
                  </TableCell>
                  <TableCell>{detail.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
