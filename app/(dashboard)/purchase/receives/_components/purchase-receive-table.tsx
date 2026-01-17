"use client";

import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { deletePurchaseReceive } from "../actions";
import { useState, useEffect } from "react";
import { PurchaseReceiveWithDetails } from "../types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Protect } from "@/components/ui/protect";
import Link from "next/link";
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

interface PurchaseReceiveTableProps {
  receives: PurchaseReceiveWithDetails[];
  totalPages: number;
  totalEntries: number;
}

export function PurchaseReceiveTable({
  receives,
  totalPages,
  totalEntries,
}: PurchaseReceiveTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const currentPage = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }
      params.set("page", "1");

      if (params.get("search") !== (searchParams.get("search") || null)) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, pathname, replace]);

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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <CustomInput
              placeholder="Search receives..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
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
            {receives.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No purchase receives found.
                </TableCell>
              </TableRow>
            ) : (
              receives.map((receive) => (
                <TableRow key={receive.id}>
                  <TableCell className="font-medium">
                    {receive.receiveNumber}
                  </TableCell>
                  <TableCell>
                    {receive.purchaseOrder?.orderNumber || "-"}
                  </TableCell>
                  <TableCell>{receive.contact.name}</TableCell>
                  <TableCell>
                    {format(new Date(receive.receiveDate), "MMM d, yyyy")}
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
      </div>

      <CustomPagination
        currentPage={currentPage}
        totalEntries={totalEntries}
        pageSize={10}
      />
    </div>
  );
}
