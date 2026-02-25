"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function StatisticsView({ data }: { data: any[] }) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredData = data.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate totals across all filtered tenants
    const totals = filteredData.reduce((acc, curr) => {
        return {
            totalRecords: acc.totalRecords + (curr.stats?.totalRecords || 0),
            salesInvoices: acc.salesInvoices + (curr.stats?.salesInvoices || 0),
            purchaseInvoices: acc.purchaseInvoices + (curr.stats?.purchaseInvoices || 0),
            contacts: acc.contacts + (curr.stats?.contacts || 0),
            products: acc.products + (curr.stats?.products || 0),
            journalEntries: acc.journalEntries + (curr.stats?.journalEntries || 0),
        };
    }, {
        totalRecords: 0,
        salesInvoices: 0,
        purchaseInvoices: 0,
        contacts: 0,
        products: 0,
        journalEntries: 0,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari tenant..."
                        className="pl-8 w-full bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tenant</TableHead>
                            <TableHead className="text-right">Faktur Penjualan</TableHead>
                            <TableHead className="text-right">Faktur Pembelian</TableHead>
                            <TableHead className="text-right">Kontak</TableHead>
                            <TableHead className="text-right">Produk</TableHead>
                            <TableHead className="text-right">Jurnal</TableHead>
                            <TableHead className="text-right font-bold">Total Record</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Tidak ada data statistik yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.tenantId}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{item.name}</span>
                                            <span className="text-xs text-muted-foreground">{item.slug}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.stats?.salesInvoices?.toLocaleString("id-ID") || 0}</TableCell>
                                    <TableCell className="text-right">{item.stats?.purchaseInvoices?.toLocaleString("id-ID") || 0}</TableCell>
                                    <TableCell className="text-right">{item.stats?.contacts?.toLocaleString("id-ID") || 0}</TableCell>
                                    <TableCell className="text-right">{item.stats?.products?.toLocaleString("id-ID") || 0}</TableCell>
                                    <TableCell className="text-right">{item.stats?.journalEntries?.toLocaleString("id-ID") || 0}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {item.stats?.totalRecords?.toLocaleString("id-ID") || 0}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}

                        {filteredData.length > 0 && (
                            <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
                                <TableCell>Total Keseluruhan</TableCell>
                                <TableCell className="text-right">{totals.salesInvoices.toLocaleString("id-ID")}</TableCell>
                                <TableCell className="text-right">{totals.purchaseInvoices.toLocaleString("id-ID")}</TableCell>
                                <TableCell className="text-right">{totals.contacts.toLocaleString("id-ID")}</TableCell>
                                <TableCell className="text-right">{totals.products.toLocaleString("id-ID")}</TableCell>
                                <TableCell className="text-right">{totals.journalEntries.toLocaleString("id-ID")}</TableCell>
                                <TableCell className="text-right">{totals.totalRecords.toLocaleString("id-ID")}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
