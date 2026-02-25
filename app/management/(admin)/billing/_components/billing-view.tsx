"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRouter } from "next/navigation";
import { BillingDialog } from "./billing-dialog";
import { PaymentDialog } from "./payment-dialog";

export function BillingView({ billings, tenants }: { billings: any[], tenants: any[] }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog states
    const [billingDialogOpen, setBillingDialogOpen] = useState(false);

    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState<any>(null);

    const filteredBillings = billings.filter(b =>
        (b.tenant?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleOpenPayment = (billing: any) => {
        setSelectedBilling(billing);
        setPaymentDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari tenant, status..."
                        className="pl-8 w-full bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={() => setBillingDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Penagihan
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Tgl Jatuh Tempo</TableHead>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Nominal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBillings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Tidak ada data penagihan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBillings.map((b) => (
                                <BillingRow
                                    key={b.id}
                                    billing={b}
                                    formatCurrency={formatCurrency}
                                    onOpenPayment={() => handleOpenPayment(b)}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <BillingDialog
                open={billingDialogOpen}
                onOpenChange={setBillingDialogOpen}
                tenants={tenants}
                onSuccess={() => {
                    setBillingDialogOpen(false);
                    router.refresh();
                }}
            />

            {selectedBilling && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onOpenChange={setPaymentDialogOpen}
                    billing={selectedBilling}
                    onSuccess={() => {
                        setPaymentDialogOpen(false);
                        setSelectedBilling(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}

function BillingRow({ billing, formatCurrency, onOpenPayment }: { billing: any, formatCurrency: (v: number) => string, onOpenPayment: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const hasPayments = billing.payments && billing.payments.length > 0;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
            <>
                <TableRow className={isOpen ? "border-b-0" : ""}>
                    <TableCell>
                        {hasPayments && (
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-9 p-0">
                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <span className="sr-only">Toggle</span>
                                </Button>
                            </CollapsibleTrigger>
                        )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                        {format(new Date(billing.dueDate), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium">
                        {billing.tenant?.name || "Unknown Tenant"}
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                        {formatCurrency(billing.amount)}
                    </TableCell>
                    <TableCell>
                        <Badge
                            variant={billing.status === "PAID" ? "default" : billing.status === "UNPAID" ? "destructive" : "outline"}
                            className={billing.status === "PAID" ? "bg-green-600" : ""}
                        >
                            {billing.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={billing.description}>
                        {billing.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                        {billing.status === "UNPAID" && (
                            <Button size="sm" variant="outline" onClick={onOpenPayment}>
                                Bayar
                            </Button>
                        )}
                    </TableCell>
                </TableRow>

                {hasPayments && (
                    <CollapsibleContent asChild>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={7} className="p-0">
                                <div className="px-14 py-3 space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Riwayat Pembayaran</h4>
                                    <Table className="bg-background border rounded-md">
                                        <TableHeader>
                                            <TableRow className="text-xs">
                                                <TableHead>Tgl Bayar</TableHead>
                                                <TableHead>Nominal</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Referensi</TableHead>
                                                <TableHead>Catatan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {billing.payments.map((p: any) => (
                                                <TableRow key={p.id} className="text-sm">
                                                    <TableCell>{format(new Date(p.paymentDate), "dd MMM yyyy HH:mm", { locale: id })}</TableCell>
                                                    <TableCell className="font-mono">{formatCurrency(p.amount)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={p.status === "SUCCESS" ? "border-green-600 text-green-600" : ""}>
                                                            {p.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{p.reference || "-"}</TableCell>
                                                    <TableCell>{p.description || "-"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TableCell>
                        </TableRow>
                    </CollapsibleContent>
                )}
            </>
        </Collapsible>
    );
}
