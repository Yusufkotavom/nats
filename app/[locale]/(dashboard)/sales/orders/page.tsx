"use client";
export const dynamic = "force-dynamic";

import { getSalesOrders, deleteSalesOrder } from "./actions";
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
import { SalesOrderFilters } from "./_components/sales-order-filters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { SalesOrderWithDetails } from "./types";
import { DataTable, Column } from "@/components/ui/data-table";
import { MoreHorizontal, Eye, Pencil, Route, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SalesOrdersPage() {
    const t = useTranslations("Sales");
    const tCommon = useTranslations("Common");
    const searchParams = useSearchParams();
    const page = Number(searchParams.get("page")) || 1;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const [isPending, startTransition] = useTransition();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: [
            "sales-orders",
            page,
            search,
            status,
            startDate,
            endDate,
        ],
        queryFn: async () => {
            const result = await getSalesOrders(
                page,
                10,
                search,
                status,
                startDate || undefined,
                endDate || undefined
            );
            return {
                orders: Array.isArray(result.orders)
                    ? []
                    : (SuperJSON.deserialize<SalesOrderWithDetails[]>(
                        result.orders as SuperJSONResult,
                    ) as SalesOrderWithDetails[]),
                total: result.total,
                totalPages: result.totalPages,
            };
        },
        staleTime: 0,
        refetchOnMount: true,
    });

    const formatCurrency = useFormatCurrency();
    const formatDate = useFormatDate();
    const confirm = useConfirm();
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        orderNumber: true,
        orderDate: true,
        customer: true,
        customerPhone: false,
        products: true,
        expectedDate: true,
        status: true,
        totalAmount: true,
        subtotal: false,
        taxAmount: false,
        discountAmount: false,
        createdBy: false,
        confirmedAt: false,
        closedAt: false,
    });

    const handleDeleteClick = async (id: string) => {
        if (
            await confirm({
                title: t("delete_sales_order"),
                description: t("delete_sales_order_desc"),
                confirmText: tCommon("delete"),
                variant: "destructive",
            })
        ) {
            startTransition(async () => {
                try {
                    await deleteSalesOrder(id);
                    queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
                    toast({
                        title: tCommon("success"),
                        description: t("delete_success"),
                    });
                } catch (error) {
                    toast({
                        title: tCommon("error"),
                        description: t("delete_error"),
                        variant: "destructive",
                    });
                }
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "DRAFT":
                return "bg-gray-500";
            case "CONFIRMED":
                return "bg-blue-500";
            case "PARTIALLY_SHIPPED":
                return "bg-yellow-500";
            case "SHIPPED":
                return "bg-purple-500";
            case "CLOSED":
                return "bg-green-500";
            case "CANCELLED":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    const allColumns: Array<{ key: string; label: string; column: Column<SalesOrderWithDetails> }> = [
        {
            key: "orderNumber",
            label: "No SO",
            column: {
            header: t("order_number"),
            accessorKey: "orderNumber",
            className: "font-medium",
            cell: (item) => (
                <Link href={`/sales/orders/${item.id}/edit`} className="text-primary hover:underline">
                    {item.orderNumber}
                </Link>
            ),
        }},
        {
            key: "orderDate",
            label: tCommon("date"),
            column: {
            header: tCommon("date"),
            accessorKey: "orderDate",
            cell: (item) => formatDate(item.orderDate),
        }},
        {
            key: "customer",
            label: tCommon("customer"),
            column: {
            header: tCommon("customer"),
            cell: (item) =>
                item.contact ? (
                    <Link target="_blank"
                        href={`/general/contacts/${item.contact.id}`}
                        className="text-primary hover:underline"
                    >
                        {item.contact.name}
                    </Link>
                ) : (
                    "-"
                ),
        }},
        {
            key: "customerPhone",
            label: "No HP Customer",
            column: {
                header: "No HP",
                cell: (item) => item.contact?.phone || "-",
            },
        },
        {
            key: "products",
            label: "Produk/Jasa",
            column: {
                header: "Produk/Jasa",
                cell: (item) =>
                    item.items?.length
                        ? item.items.map((line) => line.product?.name || "-").slice(0, 3).join(", ") + (item.items.length > 3 ? ` +${item.items.length - 3}` : "")
                        : "-",
            },
        },
        {
            key: "expectedDate",
            label: t("expected_date"),
            column: {
            header: t("expected_date"),
            accessorKey: "expectedDate",
            cell: (item) =>
                item.expectedDate ? formatDate(item.expectedDate) : "-",
        }},
        {
            key: "status",
            label: tCommon("status"),
            column: {
            header: tCommon("status"),
            accessorKey: "status",
            cell: (item) => (
                <Badge className={getStatusColor(item.status)}>
                    {item.status.replace("_", " ")}
                </Badge>
            ),
        }},
        {
            key: "totalAmount",
            label: t("total_amount"),
            column: {
            header: t("total_amount"),
            accessorKey: "totalAmount",
            className: "text-right",
            headerClassName: "text-right",
            cell: (item) => formatCurrency(Number(item.totalAmount)),
        }},
        {
            key: "subtotal",
            label: "Subtotal",
            column: {
                header: "Subtotal",
                className: "text-right",
                headerClassName: "text-right",
                cell: (item) => formatCurrency(Number(item.subtotal || 0)),
            },
        },
        {
            key: "taxAmount",
            label: "Pajak",
            column: {
                header: "Pajak",
                className: "text-right",
                headerClassName: "text-right",
                cell: (item) => formatCurrency(Number(item.taxAmount || 0)),
            },
        },
        {
            key: "discountAmount",
            label: "Diskon",
            column: {
                header: "Diskon",
                className: "text-right",
                headerClassName: "text-right",
                cell: (item) => formatCurrency(Number(item.discountAmount || 0)),
            },
        },
        {
            key: "createdBy",
            label: "User",
            column: {
                header: "User",
                cell: (item) => item.createdById || "System",
            },
        },
        {
            key: "confirmedAt",
            label: "Confirmed At",
            column: {
                header: "Confirmed",
                cell: (item) => (item.confirmedAt ? formatDate(item.confirmedAt) : "-"),
            },
        },
        {
            key: "closedAt",
            label: "Closed At",
            column: {
                header: "Closed",
                cell: (item) => (item.closedAt ? formatDate(item.closedAt) : "-"),
            },
        },
        {
            key: "actions",
            label: "Actions",
            column: {
            header: "",
            className: "w-[80px]",
            cell: (order) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{tCommon("actions")}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link target="_blank" href={`/sales/orders/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> {tCommon("details")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/sales/pipeline/${order.id}`}>
                                <Route className="mr-2 h-4 w-4" /> Open in Pipeline
                            </Link>
                        </DropdownMenuItem>
                        <Protect permission="sales.edit">
                            <DropdownMenuItem asChild>
                                <Link target="_blank" href={`/sales/orders/${order.id}/edit`}>
                                    <Pencil className="mr-2 h-4 w-4" /> {tCommon("edit")}
                                </Link>
                            </DropdownMenuItem>
                        </Protect>
                        <DropdownMenuSeparator />
                        <Protect permission="sales.delete">
                            <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 focus:text-red-900 dark:focus:bg-red-900/10"
                                onClick={() => handleDeleteClick(order.id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> {tCommon("delete")}
                            </DropdownMenuItem>
                        </Protect>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }},
    ];

    const columns: Column<SalesOrderWithDetails>[] = useMemo(() => {
        return allColumns
            .filter((entry) => entry.key === "actions" || visibleColumns[entry.key] !== false)
            .map((entry) => entry.column);
    }, [allColumns, visibleColumns]);

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title={t("sales_orders")} />
                <PageListActions>
                    <Protect permission="sales.create">
                        <Button asChild>
                            <Link href="/sales/orders/new">
                                <Plus className="mr-2 h-4 w-4" /> {t("new_order")}
                            </Link>
                        </Button>
                    </Protect>
                </PageListActions>
            </PageListHeader>
            <PageListFilter>
                <SalesOrderFilters />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" type="button">Pilih Kolom</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 space-y-2">
                        {allColumns
                            .filter((entry) => entry.key !== "actions")
                            .map((entry) => (
                                <label key={entry.key} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={visibleColumns[entry.key] !== false}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, [entry.key]: checked === true }))
                                        }
                                    />
                                    {entry.label}
                                </label>
                            ))}
                    </PopoverContent>
                </Popover>
            </PageListFilter>

            <PageListContent>
                {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                ) : (
                    <DataTable
                        data={data?.orders || []}
                        columns={columns}
                        pagination={{
                            totalEntries: data?.total || 0,
                            pageSize: 10,
                            currentPage: page,
                        }}
                        emptyMessage={t("no_orders_found")}
                    />
                )}
            </PageListContent>
        </PageListLayout>
    );
}
