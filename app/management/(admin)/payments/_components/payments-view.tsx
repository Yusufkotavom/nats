"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { useRouter } from "next/navigation";
import { PaymentDialog } from "./payment-dialog";

export function PaymentsView({ payments, tenants }: { payments: any[], tenants: any[] }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const filteredPayments = payments.filter(p =>
        (p.tenant?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.reference || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari tenant atau referensi..."
                        className="pl-8 w-full bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Pembayaran
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Nominal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Referensi/Catatan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Tidak ada riwayat pembayaran yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {format(new Date(p.paymentDate), "dd MMM yyyy HH:mm", { locale: id })}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {p.tenant?.name || "Unknown Tenant"}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatCurrency(p.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={p.status === "SUCCESS" ? "default" : p.status === "PENDING" ? "outline" : "destructive"}
                                            className={p.status === "SUCCESS" ? "bg-green-600" : p.status === "PENDING" ? "text-yellow-600 border-yellow-600" : ""}
                                        >
                                            {p.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{p.reference || "-"}</span>
                                            {p.description && <span className="text-xs text-muted-foreground">{p.description}</span>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <PaymentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                tenants={tenants}
                onSuccess={() => {
                    setDialogOpen(false);
                    router.refresh();
                }}
            />
        </div>
    );
}
