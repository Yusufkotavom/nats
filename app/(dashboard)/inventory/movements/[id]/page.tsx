"use client";

import { getMovementBatchById, getCompanyProfile } from "../actions";
import { notFound, useParams } from "next/navigation";
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
import { MovementActions } from "./_components/movement-actions";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { Prisma } from "@/prisma/generated/prisma/browser";
import { useQuery } from "@tanstack/react-query";
import { CompanyProfile } from "@/prisma/generated/prisma/client";

export type BatchWithDetails = Prisma.InventoryMovementGetPayload<{
  include: {
    fromWarehouse: true;
    toWarehouse: true;
    details: {
      include: {
        product: {
          include: {
            baseUnit: true;
          };
        };
      };
    };
    approvedBy: {
      select: {
        name: true;
        email: true;
        id: true;
      };
    };
  };
}>;

export default function MovementDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: serializedBatch, isLoading: isBatchLoading } = useQuery({
    queryKey: ["movement-batch", id],
    queryFn: () => getMovementBatchById(id),
  });

  const { data: serializedProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => getCompanyProfile(),
  });

  if (isBatchLoading || isProfileLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!serializedBatch) {
    notFound();
  }

  const batch = SuperJSON.deserialize<BatchWithDetails>(serializedBatch);
  const companyProfile = serializedProfile
    ? SuperJSON.deserialize<CompanyProfile>(serializedProfile)
    : null;

  const currencyOptions = {
    currency: companyProfile?.currency,
    currencySymbol: companyProfile?.currencySymbol,
    currencyFormat: companyProfile?.currencyFormat,
  };

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
                "bg-red-100 text-red-800 hover:bg-red-100",
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
              {formatDate(batch.createdAt, {
                dateFormat: companyProfile?.dateFormat,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle>Movement Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Batch Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.details.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product.name}
                      <div className="text-xs text-muted-foreground">
                        {item.product.sku}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.product.baseUnit?.symbol}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(item.unitCost), currencyOptions)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(
                        Number(item.unitCost) * item.quantity,
                        currencyOptions,
                      )}
                    </TableCell>
                    <TableCell>{item.batchNumber || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-3 lg:col-span-3">
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                From Location
              </span>
              <div className="flex items-center rounded-md border p-3">
                {batch.fromWarehouse ? (
                  <div>
                    <div className="font-medium">
                      {batch.fromWarehouse.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {batch.fromWarehouse.location || "No address"}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    External / Adjustment
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                To Location
              </span>
              <div className="flex items-center rounded-md border p-3">
                {batch.toWarehouse ? (
                  <div>
                    <div className="font-medium">{batch.toWarehouse.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {batch.toWarehouse.location || "No address"}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    External / Adjustment
                  </div>
                )}
              </div>
            </div>

            {batch.notes && (
              <div className="space-y-2 pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Notes
                </span>
                <div className="rounded-md bg-muted p-3 text-sm">
                  {batch.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
