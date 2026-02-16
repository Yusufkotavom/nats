"use client";

import {
  getMovementBatches,
  approveMovement,
  rejectMovement,
} from "../actions";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Check, X } from "lucide-react";
import { SuperJSON } from "@/lib/superjson";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useTransition } from "react";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  InventoryMovement,
  InventoryMovementDetail,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";
import { useFormatDate } from "@/hooks";
import { SuperJSONResult } from "superjson";


type BatchWithDetails = Omit<InventoryMovement, "status"> & {
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
  details: (InventoryMovementDetail & {
    product: Product;
  })[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  approvedBy?: { name: string; email: string } | null;
  rejectionReason?: string | null;
};

function BatchActions({ batch }: { batch: BatchWithDetails }) {
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();
  const alert = useAlert();
  const queryClient = useQueryClient();
  const formatDate = useFormatDate();

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
        } else {
          queryClient.invalidateQueries({ queryKey: ["movement-batches"] });
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
      } else {
        queryClient.invalidateQueries({ queryKey: ["movement-batches"] });
      }
    });
  };

  if (batch.status === "PENDING") {
    return (
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
    );
  }

  if (
    (batch.status === "COMPLETED" || batch.status === "APPROVED") &&
    batch.approvedBy
  ) {
    return (
      <div className="flex flex-col text-xs text-muted-foreground">
        <span>Approved by</span>
        <span className="font-medium">{batch.approvedBy.name}</span>
      </div>
    );
  }

  return null;
}

export function MovementsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const formatDate = useFormatDate();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["movement-batches", { page, pageSize }],
    queryFn: async () => {
      const { batches, total } = await getMovementBatches(page, pageSize);
      return {
        batches: SuperJSON.deserialize<BatchWithDetails[]>(batches as unknown as SuperJSONResult),
        total,
      };
    },
    placeholderData: keepPreviousData,
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns: Column<BatchWithDetails>[] = [
    {
      header: "Date",
      cell: (batch) => formatDate(batch.transactionDate),
    },
    {
      header: "Type",
      cell: (batch) => (
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
      ),
    },
    {
      header: "Status",
      cell: (batch) => (
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
      ),
    },
    {
      header: "Reference",
      cell: (batch) => batch.reference || "-",
    },
    {
      header: "From",
      cell: (batch) => batch.fromWarehouse?.name || "-",
    },
    {
      header: "To",
      cell: (batch) => batch.toWarehouse?.name || "-",
    },
    {
      header: "Items",
      cell: (batch) => `${batch.details.length} items`,
    },
    {
      header: "Approval",
      cell: (batch) => <BatchActions batch={batch} />,
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Inventory Movements" />
        <PageListActions>
          <Protect permission="inventory_movements.create">
            <Button asChild>
              <Link href="/inventory/movements/create">
                <Plus className="mr-2 h-4 w-4" /> Record Movement
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>
      <PageListContent>
        <DataTable
          data={data?.batches || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No movement batches found."
          pagination={{
            totalEntries: data?.total || 0,
            pageSize,
            currentPage: page,
            onPageChange: handlePageChange,
          }}
          onRowClick={(batch) =>
            router.push(`/inventory/movements/${batch.id}`)
          }
        />
      </PageListContent>
    </PageListLayout>
  );
}
