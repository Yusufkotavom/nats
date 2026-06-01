"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { createServiceAfterSalesCase, getServiceAfterSales, getServiceOrders } from "../actions";
import type { ServiceAfterSalesCaseListItem, ServiceOrderListItem } from "../../types";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { useToast } from "@/hooks/use-toast";

function getStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return "bg-green-500";
    case "DRAFT":
      return "bg-blue-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export function ServiceReturnsWarrantyList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [caseServiceOrderId, setCaseServiceOrderId] = useState("");
  const [caseType, setCaseType] = useState<"RETURN" | "WARRANTY">("RETURN");
  const [caseNotes, setCaseNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const { toast } = useToast();

  const afterSalesQuery = useQuery({
    queryKey: ["services-after-sales-standalone", page, search, status, startDate, endDate],
    queryFn: async () => {
      const result = await getServiceAfterSales(
        page,
        10,
        search,
        status,
        startDate || undefined,
        endDate || undefined,
      );
      return { rows: result.data, total: result.total };
    },
  });

  const doneOrdersQuery = useQuery({
    queryKey: ["services-orders-for-case"],
    queryFn: async () => {
      const result = await getServiceOrders(1, 200, "", "ALL");
      return result.data;
    },
  });

  const doneOrders = useMemo(
    () => (doneOrdersQuery.data || []).filter((row: ServiceOrderListItem) => row.status === "DONE" || row.status === "CLOSED"),
    [doneOrdersQuery.data],
  );

  const handleCreateCase = async () => {
    if (!caseServiceOrderId) {
      toast({ title: "Pilih service order terlebih dahulu", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      await createServiceAfterSalesCase({
        serviceOrderId: caseServiceOrderId,
        caseType,
        notes: caseNotes,
      });
      setCreateOpen(false);
      setCaseServiceOrderId("");
      setCaseType("RETURN");
      setCaseNotes("");
      await afterSalesQuery.refetch();
      toast({ title: "Case return/garansi berhasil dibuat" });
    } catch (error) {
      toast({
        title: "Gagal membuat case",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<ServiceAfterSalesCaseListItem>[] = [
    { header: "Case #", accessorKey: "returnNumber", className: "font-medium" },
    { header: "Type", cell: (item) => <Badge>{item.caseType}</Badge> },
    { header: "Order #", accessorKey: "serviceOrderNumber" },
    { header: "Customer", accessorKey: "customerName" },
    { header: "Tanggal", cell: (item) => formatDate(item.returnDate) },
    {
      header: "Garansi",
      cell: (item) => {
        if (item.caseType !== "WARRANTY") return <span className="text-muted-foreground">-</span>;
        if (!item.warrantyEndsAt) return <span className="text-muted-foreground">-</span>;
        if (item.warrantyExpired) return <span className="text-red-600">Expired</span>;
        return (
          <span className="text-xs">
            sisa {item.warrantyRemainingDays ?? 0} hari (~{item.warrantyRemainingMonths ?? 0} bln)
          </span>
        );
      },
    },
    { header: "Status", cell: (item) => <Badge className={getStatusColor(item.status)}>{item.status}</Badge> },
    { header: "Total", className: "text-right", headerClassName: "text-right", cell: (item) => formatCurrency(Number(item.totalAmount)) },
    {
      header: "",
      className: "w-[90px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/services/returns-warranty/${item.id}`}>Detail</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/services/returns-warranty/${item.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Service Returns & Warranty" />
        <PageListActions>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>Buat Case Return/Garansi</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Buat Case Return/Garansi</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Service Order</Label>
                  <Select value={caseServiceOrderId} onValueChange={setCaseServiceOrderId}>
                    <SelectTrigger><SelectValue placeholder="Pilih order selesai" /></SelectTrigger>
                    <SelectContent>
                      {doneOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>{order.orderNumber} - {order.customerName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tipe Case</Label>
                  <Select value={caseType} onValueChange={(value) => setCaseType(value as "RETURN" | "WARRANTY")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETURN">RETURN</SelectItem>
                      <SelectItem value="WARRANTY">WARRANTY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Catatan</Label>
                  <Textarea value={caseNotes} onChange={(event) => setCaseNotes(event.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Batal</Button>
                  <Button onClick={handleCreateCase} disabled={creating}>{creating ? "Menyimpan..." : "Buat Case"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageListActions>
      </PageListHeader>
      <PageListFilter>
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search case/order/customer"
          className="w-full max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as "ALL" | "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ALL</SelectItem>
            <SelectItem value="DRAFT">DRAFT</SelectItem>
            <SelectItem value="APPROVED">APPROVED</SelectItem>
            <SelectItem value="COMPLETED">COMPLETED</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="w-[170px]" />
        <Input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="w-[170px]" />
      </PageListFilter>
      <PageListContent>
        <DataTable
          data={afterSalesQuery.data?.rows ?? []}
          columns={columns}
          isLoading={afterSalesQuery.isLoading}
          emptyMessage="Belum ada case return/garansi"
          pagination={{
            totalEntries: afterSalesQuery.data?.total ?? 0,
            pageSize: 10,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>
    </PageListLayout>
  );
}
