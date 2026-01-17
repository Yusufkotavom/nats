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
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { approveMovement, rejectMovement } from "../actions";

export type BatchWithDetails = Omit<InventoryMovement, "status"> & {
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
  details: (InventoryMovementDetail & {
    product: Product;
  })[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  approvedBy?: { name: string; email: string } | null;
  rejectionReason?: string | null;
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
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Approval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
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

import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";

function BatchRow({ batch }: { batch: BatchWithDetails }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const alert = useAlert();

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      await confirm({
        title: "Approve Movement",
        description:
          "Are you sure you want to approve this movement? This will update inventory levels and cannot be undone.",
      })
    ) {
      startTransition(async () => {
        const result = await approveMovement(batch.id);
        if (!result.success) {
          await alert({ title: "Error", description: result.error });
        }
      });
    }
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    startTransition(async () => {
      const result = await rejectMovement({ movementId: batch.id, reason });
      if (!result.success) {
        await alert({ title: "Error", description: result.error });
      }
    });
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => router.push(`/inventory/movements/${batch.id}`)}
    >
      <TableCell className="w-[50px]"></TableCell>
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
      <TableCell>
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
      </TableCell>
      <TableCell>{batch.reference || "-"}</TableCell>
      <TableCell>{batch.fromWarehouse?.name || "-"}</TableCell>
      <TableCell>{batch.toWarehouse?.name || "-"}</TableCell>
      <TableCell>{batch.details.length} items</TableCell>
      <TableCell>
        {batch.status === "PENDING" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleApprove}
              disabled={isPending}
              title="Approve"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleReject}
              disabled={isPending}
              title="Reject"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
        {(batch.status === "COMPLETED" || batch.status === "APPROVED") &&
          batch.approvedBy && (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span>Approved by</span>
              <span className="font-medium">{batch.approvedBy.name}</span>
            </div>
          )}
        {batch.status === "REJECTED" && (
          <div className="flex flex-col text-xs text-muted-foreground">
            <span className="text-red-500 font-medium">Rejected</span>
            <span title={batch.rejectionReason || ""}>
              {batch.rejectionReason
                ? batch.rejectionReason.length > 20
                  ? batch.rejectionReason.slice(0, 20) + "..."
                  : batch.rejectionReason
                : "-"}
            </span>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
