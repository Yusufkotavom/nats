"use client";

import { getPurchaseReceives, deletePurchaseReceive } from "./actions";
import { Protect } from "@/components/ui/protect";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { PurchaseReceiveFilters } from "./_components/purchase-receive-filters";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { PurchaseReceiveWithDetails } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatDate } from "@/hooks";

export default function PurchaseReceivesPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const formatDate = useFormatDate();

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-receives", page, search],
    queryFn: async () => {
      const result = await getPurchaseReceives(page, 10, search);
      return {
        receives: SuperJSON.deserialize<PurchaseReceiveWithDetails[]>(
          result.receives
        ),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
  });

  const confirm = useConfirm();

  const handleDeleteClick = async (id: string) => {
    if (
      await confirm({
        title: "Delete Purchase Receive",
        description:
          "Are you sure you want to delete this receive? This action cannot be undone.",
        variant: "destructive",
      })
    ) {
      await deletePurchaseReceive(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "COMPLETED":
        return "bg-green-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Purchase Receives" />
        <PageListActions>
          <Protect permission="purchase.create">
            <Button asChild>
              <Link href="/purchase/receives/new">
                <Plus className="mr-2 h-4 w-4" /> New Receive
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <PurchaseReceiveFilters />
      </PageListFilter>

      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receive #</TableHead>
              <TableHead>PO #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.receives.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No purchase receives found.
                </TableCell>
              </TableRow>
            ) : (
              data?.receives.map((receive) => (
                <TableRow key={receive.id}>
                  <TableCell className="font-medium">
                    {receive.receiveNumber}
                  </TableCell>
                  <TableCell>
                    {receive.purchaseOrder?.orderNumber || "-"}
                  </TableCell>
                  <TableCell>{receive.contact.name}</TableCell>
                  <TableCell>
                    {formatDate(receive.receiveDate)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(receive.status)}>
                      {receive.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/purchase/receives/${receive.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Details
                          </Link>
                        </DropdownMenuItem>
                        {receive.status !== "COMPLETED" && (
                          <Protect permission="purchase.edit">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/purchase/receives/${receive.id}/edit`}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                          </Protect>
                        )}
                        <DropdownMenuSeparator />
                        {receive.status !== "COMPLETED" && (
                          <Protect permission="purchase.delete">
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                              onClick={() => handleDeleteClick(receive.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </Protect>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <CustomPagination
          currentPage={page}
          totalEntries={data?.total || 0}
          pageSize={10}
        />
      </PageListContent>
    </PageListLayout>
  );
}
